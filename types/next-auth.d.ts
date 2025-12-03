import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "superadmin" | "admin" | "teacher";
      organizationId?: string | null;
      organizationName?: string | null;
      organizationDomain?: string | null;
    };
  }

  interface User {
    role?: "superadmin" | "admin" | "teacher";
    organizationId?: string | null;
    organizationName?: string | null;
    organizationDomain?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "superadmin" | "admin" | "teacher";
    organizationId?: string | null;
    organizationName?: string | null;
    organizationDomain?: string | null;
  }
}
