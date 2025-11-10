import { NextResponse } from "next/server";
import { auth } from "./auth";

const ADMIN_PATH = "/admin";
const SUPER_ADMIN_PATH = "/super-admin";

export default auth((request) => {
  const { nextUrl, auth: session } = request;
  const isLoggedIn = Boolean(session);
  const isAdminPath = nextUrl.pathname.startsWith(ADMIN_PATH);
  const isSuperAdminPath = nextUrl.pathname.startsWith(SUPER_ADMIN_PATH);

  if (!isLoggedIn) {
    const signInUrl = new URL("/login", nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }

  const role = session?.user?.role ?? "teacher";

  if (isSuperAdminPath && role !== "superadmin") {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  if (isAdminPath && role !== "admin" && role !== "superadmin") {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/super-admin/:path*"],
};
