import NextAuth from "next-auth";
import { prisma } from "./lib/prisma";
import { getOrganizationByDomain } from "./lib/organizations";
import { authConfig, sessionTokenCookieName } from "./auth.config";

const domain = process.env.ALLOWED_GOOGLE_DOMAIN;
const normalizedDomain = domain?.toLowerCase();
const requiredKeys = ["NEXTAUTH_SECRET"] as const;

export { sessionTokenCookieName };

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

// Optional allowlist to bypass domain gating (for demo/test accounts only).
// These accounts still take their role from the Teacher record and must have
// an assigned organization in the DB.
const exceptionEmails = new Set(
  (process.env.ALLOWED_EMAIL_EXCEPTIONS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

function isAllowedDomain(email?: string | null, hostedDomain?: string | null) {
  // SECURITY: If no domain is configured, reject by default (fail-safe)
  if (!normalizedDomain) return false;
  if (!email) return false;
  const emailAllowed = email.toLowerCase().endsWith(`@${normalizedDomain}`);
  // For TebTally OIDC, we trust the email domain since TebTally handles authentication
  // The hd claim is only available from Google OAuth, not TebTally OIDC
  const hdAllowed = hostedDomain ? hostedDomain.toLowerCase() === normalizedDomain : true;
  return emailAllowed && hdAllowed;
}

async function getTeacher(email: string) {
  return prisma.teacher.findUnique({
    where: { email },
    include: {
      organization: { select: { id: true, name: true, domain: true } },
    },
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
    await prisma.teacher.create({
      data: {
        email,
        role: desiredRole,
        displayName: displayName ?? null,
        organizationId,
      },
    });
    return getTeacher(email);
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
    include: {
      organization: { select: { id: true, name: true, domain: true } },
    },
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
    ...authConfig,
    providers: [
      {
        id: "tebtally",
        name: "TebTally",
        type: "oidc",
        issuer: process.env.TEBTALLY_ISSUER || "https://id.tebtally.com",
        clientId: process.env.TEBTALLY_CLIENT_ID!,
        clientSecret: process.env.TEBTALLY_CLIENT_SECRET!,
        allowDangerousEmailAccountLinking: true,
      },
    ],
    callbacks: {
      async signIn({ profile }) {
        const email = profile?.email?.toLowerCase();
        const hostedDomain = typeof profile?.hd === "string" ? profile.hd.toLowerCase() : undefined;
        const domain = getEmailDomain(email);
        const isSuperAdmin = email ? superAdminEmails.has(email) : false;
        if (!email) return false;

        let organizationId: string | null = null;
        const isException = email ? exceptionEmails.has(email) : false;

        if (!isSuperAdmin && !isException && !isAllowedDomain(email, hostedDomain)) {
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

        if (!isSuperAdmin && isException) {
          // For exception accounts, require an existing teacher with an organization.
          const existingTeacher = await getTeacher(email);
          if (!existingTeacher || !existingTeacher.organizationId) {
            console.warn(
              JSON.stringify({
                event: "signInBlocked",
                reason: "exceptionMissingTeacher",
                email,
              }),
            );
            return false;
          }
          organizationId = existingTeacher.organizationId;
        } else if (!isSuperAdmin) {
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
        token.organizationName = teacher.organization?.name ?? null;
        token.organizationDomain = teacher.organization?.domain ?? null;
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
          session.user.organizationName =
            typeof token.organizationName === "string" ? token.organizationName : null;
          session.user.organizationDomain =
            typeof token.organizationDomain === "string" ? token.organizationDomain : null;
        }
        return session;
      },
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













