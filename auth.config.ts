import type { NextAuthConfig } from "next-auth";

// Lightweight auth config for middleware (edge runtime compatible)
// Does NOT include callbacks that require Prisma

export const sessionTokenCookieName =
  process.env.NODE_ENV === "production"
    ? "__Secure-tracktally.session-token"
    : "tracktally.session-token";

export const authConfig: NextAuthConfig = {
  providers: [
    {
      id: "tebtally",
      name: "TebTally",
      type: "oidc",
      issuer: process.env.TEBTALLY_ISSUER || "https://id.tebtally.com",
      clientId: process.env.TEBTALLY_CLIENT_ID!,
      clientSecret: process.env.TEBTALLY_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false, // SECURITY: Disabled to prevent account takeover via email hijacking
      authorization: { params: { scope: "openid email profile" } },
      userinfo: true,
    },
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
    // Edge-compatible session callback - reads role from JWT token
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
  pages: {
    signIn: "/login",
  },
};
