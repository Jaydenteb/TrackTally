import { NextResponse } from "next/server";
import { consumeTransferToken } from "../../../../../lib/mobile-auth";
import { authConfigured, sessionTokenCookieName } from "../../../../../auth";

function buildRedirectUrl(path: string, request: Request) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}${path}`;
}

export async function GET(request: Request) {
  if (!authConfigured) {
    return NextResponse.json(
      { error: "Authentication is not configured." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const transfer = url.searchParams.get("transfer");
  if (!transfer) {
    return NextResponse.json({ error: "Missing transfer token." }, { status: 400 });
  }

  const result = await consumeTransferToken(transfer);
  if (!result) {
    return NextResponse.json({ error: "Transfer token invalid or expired." }, { status: 410 });
  }

  const redirectUrl = buildRedirectUrl(result.redirectPath, request);
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set({
    name: sessionTokenCookieName,
    value: result.sessionToken,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
