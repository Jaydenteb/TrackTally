type Bucket = {
  count: number;
  expiresAt: number;
  timeout?: ReturnType<typeof setTimeout>;
};

type RateLimitResult = {
  limited: boolean;
  remaining: number;
  reset: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, Bucket>();

export const defaultLimits = {
  // 30 incidents per hour (reasonable for a typical teacher)
  incident: { limit: 30, windowMs: 60 * 60 * 1000 },
  // 100 admin requests per hour (viewing dashboards, managing data)
  admin: { limit: 100, windowMs: 60 * 60 * 1000 },
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.expiresAt <= now) {
    if (bucket?.timeout) {
      clearTimeout(bucket.timeout);
    }
    const expiresAt = now + windowMs;
    const timeout = setTimeout(() => buckets.delete(key), windowMs).unref?.();
    buckets.set(key, { count: 1, expiresAt, timeout });
    return {
      limited: false,
      remaining: limit - 1,
      reset: expiresAt,
      retryAfterSeconds: 0,
    };
  }

  if (bucket.count >= limit) {
    return {
      limited: true,
      remaining: 0,
      reset: bucket.expiresAt,
      retryAfterSeconds: Math.ceil((bucket.expiresAt - now) / 1000),
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    limited: false,
    remaining: limit - bucket.count,
    reset: bucket.expiresAt,
    retryAfterSeconds: 0,
  };
}

export function buildRateLimitHeaders(
  limit: number,
  result: RateLimitResult,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(result.remaining, 0)),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
  };

  if (result.limited) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}
