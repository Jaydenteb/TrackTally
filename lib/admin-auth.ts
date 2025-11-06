import { NextResponse } from "next/server";
import { auth } from "../auth";
import { buildRateLimitHeaders, defaultLimits, rateLimit } from "./rate-limit";

export async function requireAdmin(request?: Request) {
  const session = await auth();

  if (!session) {
    return {
      error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }

  const email = session.user?.email?.toLowerCase() ?? "";
  const domain = process.env.ALLOWED_GOOGLE_DOMAIN?.toLowerCase();
  if (domain && !email.endsWith(`@${domain}`)) {
    return {
      error: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    };
  }

  if (session.user?.role !== "admin") {
    return {
      error: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    };
  }

  if (!request) {
    return { session };
  }

  const headers = request.headers;
  const ip =
    headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    headers.get("x-real-ip") ||
    "unknown";

  const ipResult = rateLimit(
    `admin:ip:${ip}`,
    defaultLimits.admin.limit,
    defaultLimits.admin.windowMs,
  );

  if (ipResult.limited) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Too many requests from this address. Please slow down." },
        {
          status: 429,
          headers: buildRateLimitHeaders(defaultLimits.admin.limit, ipResult),
        },
      ),
    };
  }

  const userResult = rateLimit(
    `admin:user:${email}`,
    defaultLimits.admin.limit,
    defaultLimits.admin.windowMs,
  );

  if (userResult.limited) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Too many admin requests. Please slow down." },
        {
          status: 429,
          headers: buildRateLimitHeaders(defaultLimits.admin.limit, userResult),
        },
      ),
    };
  }

  const rateHeaders = buildRateLimitHeaders(defaultLimits.admin.limit, userResult);

  return { session, rateHeaders };
}
