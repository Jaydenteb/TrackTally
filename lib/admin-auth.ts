import { NextResponse } from "next/server";
import { auth } from "../auth";
import { buildRateLimitHeaders, defaultLimits, rateLimit } from "./rate-limit";

type RequireAdminOptions = {
  allowSuperAdmin?: boolean;
  enforceDomain?: boolean;
};

export async function requireAdmin(request?: Request, options?: RequireAdminOptions) {
  const allowSuperAdmin = options?.allowSuperAdmin ?? true;
  const enforceDomain = options?.enforceDomain ?? true;

  const session = await auth();

  if (!session) {
    return {
      error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }

  const email = session.user?.email?.toLowerCase() ?? "";
  const role = session.user?.role ?? "teacher";
  const organizationId = session.user?.organizationId ?? null;
  const domain = process.env.ALLOWED_GOOGLE_DOMAIN?.toLowerCase();
  if (enforceDomain && domain && role !== "superadmin" && !email.endsWith(`@${domain}`)) {
    return {
      error: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    };
  }

  const isAdmin = role === "admin";
  const isSuperAdmin = role === "superadmin";
  if (!isAdmin && !(allowSuperAdmin && isSuperAdmin)) {
    return {
      error: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    };
  }

  if (!isSuperAdmin && !organizationId) {
    return {
      error: NextResponse.json({ ok: false, error: "Organization not set." }, { status: 403 }),
    };
  }

  if (!request) {
    return { session, organizationId };
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

  return { session, rateHeaders, organizationId };
}

export async function requireSuperAdmin(request?: Request) {
  const session = await auth();

  if (!session || session.user?.role !== "superadmin") {
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
    `superadmin:ip:${ip}`,
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

  const userEmail = session.user.email?.toLowerCase() ?? "unknown";
  const userResult = rateLimit(
    `superadmin:user:${userEmail}`,
    defaultLimits.admin.limit,
    defaultLimits.admin.windowMs,
  );

  if (userResult.limited) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Too many requests. Please slow down." },
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
