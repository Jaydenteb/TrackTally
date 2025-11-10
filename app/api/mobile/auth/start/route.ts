import { NextResponse } from "next/server";
import { authConfigured } from "../../../../../auth";
import { createTicket, sanitizeRedirectPath } from "../../../../../lib/mobile-auth";

type StartRequestBody = {
  redirectPath?: string;
};

function getBaseUrl(request: Request) {
  const envUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  if (!authConfigured) {
    return NextResponse.json(
      { error: "Authentication is not configured." },
      { status: 503 },
    );
  }

  let body: StartRequestBody = {};
  try {
    body = (await request.json()) as StartRequestBody;
  } catch {
    body = {};
  }

  const redirectPath = sanitizeRedirectPath(body.redirectPath);
  const ticket = await createTicket({ redirectPath });
  const authBase = getBaseUrl(request);
  const authUrl = `${authBase}/mobile-auth?state=${encodeURIComponent(ticket.state)}`;

  return NextResponse.json({
    state: ticket.state,
    authUrl,
    redirectPath: ticket.redirectPath,
    expiresAt: ticket.expiresAt.toISOString(),
  });
}
