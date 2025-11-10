import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "./lib/prisma";
import { getOrganizationByDomain } from "./lib/organizations";

const domain = process.env.ALLOWED_GOOGLE_DOMAIN;
const normalizedDomain = domain?.toLowerCase();
const requiredKeys = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET"] as const;
export const sessionTokenCookieName =
  process.env.NODE_ENV === "production"
    ? "__Secure-tracktally.session-token"
    : "tracktally.session-token";

const bootstrapAdmins = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const superAdminEmails = new Set(
  (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

function isAllowedDomain(email?: string | null, hostedDomain?: string | null) {
  // SECURITY: If no domain is configured, reject by default (fail-safe)
  if (!normalizedDomain) return false;
  if (!email) return false;
  const emailAllowed = email.toLowerCase().endsWith(`@${normalizedDomain}`);
  const hdAllowed = hostedDomain ? hostedDomain.toLowerCase() === normalizedDomain : false;
  return emailAllowed && hdAllowed;
}

async function getTeacher(email: string) {
  return prisma.teacher.findUnique({
    where: { email },
  });
}

function getEmailDomain(email?: string | null) {
  if (!email) return null;
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  return parts[1]?.toLowerCase() ?? null;
}

function deriveRole(email: string) {
  if (superAdminEmails.has(email)) return "superadmin";
  if (bootstrapAdmins.has(email)) return "admin";
  return "teacher";
}

async function ensureTeacher(email: string, displayName: string | null, organizationId: string | null) {
  let teacher = await getTeacher(email);
  const desiredRole = deriveRole(email);
  const data: { role?: string; displayName?: string | null; organizationId?: string | null } = {};

  if (!teacher) {
    teacher = await prisma.teacher.create({
      data: {
        email,
        role: desiredRole,
        displayName: displayName ?? null,
        organizationId,
      },
    });
    return teacher;
  }
  if (teacher.role !== desiredRole && desiredRole) {
    data.role = desiredRole;
  }
  if (teacher.organizationId !== organizationId) {
    data.organizationId = organizationId;
  }
  if (displayName && teacher.displayName !== displayName) {
    data.displayName = displayName;
  }
  if (Object.keys(data).length === 0) {
    return teacher;
  }

  return prisma.teacher.update({
    where: { id: teacher.id },
    data,
  });
}

export const missingAuthEnvVars = requiredKeys.filter((key) => !process.env[key]);
export const authConfigured = missingAuthEnvVars.length === 0;

type NextAuthReturn = ReturnType<typeof NextAuth>;

let handlers: NextAuthReturn["handlers"];
let authFn: NextAuthReturn["auth"];
let signInFn: NextAuthReturn["signIn"];
let signOutFn: NextAuthReturn["signOut"];

if (authConfigured) {
  const nextAuth = NextAuth({
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ],
    secret: process.env.NEXTAUTH_SECRET!,
    session: {
      strategy: "jwt",
    },
    cookies: {
      sessionToken: {
        name: sessionTokenCookieName,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
        },
      },
    },
    callbacks: {
      async signIn({ profile }) {
        const email = profile?.email?.toLowerCase();
        const hostedDomain = typeof profile?.hd === "string" ? profile.hd.toLowerCase() : undefined;
        const domain = getEmailDomain(email);
        const isSuperAdmin = email ? superAdminEmails.has(email) : false;
        if (!isSuperAdmin && !isAllowedDomain(email, hostedDomain)) {
          console.warn(
            JSON.stringify({
              event: "signInBlocked",
              reason: "domainMismatch",
              email: email ?? "unknown",
              hostedDomain: hostedDomain ?? null,
              allowedDomain: normalizedDomain ?? null,
            }),
          );
          return false;
        }
        if (!email) return false;

        let organizationId: string | null = null;
        if (!isSuperAdmin) {
          if (!domain) {
            console.warn(JSON.stringify({ event: "signInBlocked", reason: "missingDomain", email }));
            return false;
          }
          const org = await getOrganizationByDomain(domain);
          if (!org) {
            console.warn(
              JSON.stringify({
                event: "signInBlocked",
                reason: "organizationMissing",
                email,
                domain,
              }),
            );
            return false;
          }
          organizationId = org.id;
        }

        const teacher = await ensureTeacher(email, profile?.name ?? null, organizationId);
        if (!teacher) {
          console.warn(
            JSON.stringify({
              event: "signInBlocked",
              reason: "notProvisioned",
              email,
            }),
          );
          return false;
        }

        if (!teacher.active) {
          console.warn(
            JSON.stringify({
              event: "signInBlocked",
              reason: "inactive",
              email,
            }),
          );
          return false;
        }

        return true;
      },
      async jwt({ token, trigger, session }) {
        const email = token.email?.toLowerCase() ?? session?.user?.email?.toLowerCase();
        if (!email) return token;

        if (trigger !== "signIn" && token.role) {
          return token;
        }

        const teacher = await getTeacher(email);
        if (!teacher) return token;

        token.role =
          teacher.role === "superadmin"
            ? "superadmin"
            : teacher.role === "admin"
              ? "admin"
              : "teacher";
        token.name = teacher.displayName ?? token.name;
        token.organizationId = teacher.organizationId ?? null;
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.role =
            token.role === "superadmin" || token.role === "admin" || token.role === "teacher"
              ? (token.role as any)
              : "teacher";
          if (token.name) {
            session.user.name = token.name as string;
          }
          session.user.organizationId =
            typeof token.organizationId === "string" ? token.organizationId : null;
        }
        return session;
      },
    },
    pages: {
      signIn: "/login",
    },
  });

  handlers = nextAuth.handlers;
  authFn = nextAuth.auth;
  signInFn = nextAuth.signIn;
  signOutFn = nextAuth.signOut;
} else {
  console.warn(
    `TrackTally authentication disabled. Missing env vars: ${missingAuthEnvVars.join(", ")}`,
  );

  handlers = {
    GET: async () =>
      Response.json(
        {
          ok: false,
          error: `Authentication not configured. Missing env vars: ${missingAuthEnvVars.join(
            ", ",
          )}`,
        },
        { status: 503 },
      ),
    POST: async () =>
      Response.json(
        {
          ok: false,
          error: `Authentication not configured. Missing env vars: ${missingAuthEnvVars.join(
            ", ",
          )}`,
        },
        { status: 503 },
      ),
  };

  authFn = (async () => null) as NextAuthReturn["auth"];
  signInFn = (async () => {
    throw new Error(
      `Authentication not configured. Missing env vars: ${missingAuthEnvVars.join(", ")}`,
    );
  }) as NextAuthReturn["signIn"];
  signOutFn = (async () => {}) as NextAuthReturn["signOut"];
}

export { handlers, authFn as auth, signInFn as signIn, signOutFn as signOut };
















