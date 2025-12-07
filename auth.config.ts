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
  pages: {
    signIn: "/login",
  },
};
