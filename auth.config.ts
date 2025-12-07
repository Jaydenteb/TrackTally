import type { NextAuthConfig } from "next-auth";

// Lightweight auth config for middleware (edge runtime compatible)
// Does NOT include callbacks that require Prisma
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
  pages: {
    signIn: "/login",
  },
};
