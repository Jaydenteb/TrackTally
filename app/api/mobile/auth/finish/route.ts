import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth, authConfigured, sessionTokenCookieName } from "../../../../../auth";
import { issueTransferToken, storeSessionToken } from "../../../../../lib/mobile-auth";

function buildHtml(targetUrl: string) {
  const escaped = targetUrl.replace(/"/g, "&quot;");
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Returning to TrackTally™</title>
      <meta http-equiv="refresh" content="0;url='${escaped}'" />
      <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 2rem; text-align: center; }
      </style>
      <script>window.location.href = "${escaped}";</script>
    </head>
    <body>
      <p>Redirecting to the TrackTally™ app&hellip;</p>
      <p>If nothing happens, <a href="${escaped}">tap here</a>.</p>
    </body>
  </html>`;
}

export async function GET(request: Request) {
  if (!authConfigured) {
    return NextResponse.json(
      { error: "Authentication is not configured." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  if (!state) {
    return NextResponse.json({ error: "Missing state parameter." }, { status: 400 });
  }

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 401 });
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(sessionTokenCookieName)?.value;
  if (!cookieValue) {
    return NextResponse.json({ error: "Missing session token." }, { status: 401 });
  }

  const stored = await storeSessionToken(state, cookieValue);
  if (!stored) {
    return NextResponse.json({ error: "State expired or invalid." }, { status: 410 });
  }

  const transfer = await issueTransferToken(state);
  if (!transfer) {
    return NextResponse.json({ error: "Could not issue transfer token." }, { status: 500 });
  }

  const targetUrl = `tracktally://auth-complete?transfer=${encodeURIComponent(transfer.transferToken)}`;
  return new NextResponse(buildHtml(targetUrl), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
