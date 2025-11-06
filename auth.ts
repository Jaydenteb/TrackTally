import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "./lib/prisma";

const domain = process.env.ALLOWED_GOOGLE_DOMAIN;
const normalizedDomain = domain?.toLowerCase();
const requiredKeys = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET"] as const;
const bootstrapAdmins = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

function isAllowedDomain(email?: string | null, hostedDomain?: string | null) {
  if (!normalizedDomain) return true;
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

async function ensureTeacher(email: string, displayName?: string | null) {
  let teacher = await getTeacher(email);
  if (!teacher) {
    const role = bootstrapAdmins.has(email) ? "admin" : "teacher";
    teacher = await prisma.teacher.create({
      data: {
        email,
        role,
        displayName: displayName ?? null,
      },
    });
  }
  return teacher;
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
        name:
          process.env.NODE_ENV === "production"
            ? "__Secure-tracktally.session-token"
            : "tracktally.session-token",
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
        if (!isAllowedDomain(email, hostedDomain)) {
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

        const teacher = await ensureTeacher(email, profile?.name);
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
      async jwt({ token, trigger }) {
        const email = token.email?.toLowerCase();
        if (!email) return token;

        if (trigger !== "signIn" && token.role) {
          return token;
        }

        const teacher = await getTeacher(email);
        if (!teacher) return token;

        token.role = teacher.role === "admin" ? "admin" : "teacher";
        token.name = teacher.displayName ?? token.name;
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.role =
            token.role === "admin" || token.role === "teacher" ? (token.role as any) : "teacher";
          if (token.name) {
            session.user.name = token.name as string;
          }
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













