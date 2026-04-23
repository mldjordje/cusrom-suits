import type { NextRequest } from "next/server";

type Bucket = {
  hits: number;
  resetAt: number;
};

// In-memory sliding window. OK for a single Vercel instance / low traffic.
// For multi-region, swap to Upstash Ratelimit or similar.
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

const prune = (now: number) => {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
    if (buckets.size < MAX_BUCKETS) break;
  }
};

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  scope: string;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const getClientKey = (req: NextRequest) => {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const primary = forwarded.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip") || "";
  return primary || realIp || "unknown";
};

export const checkRateLimit = (req: NextRequest, options: RateLimitOptions): RateLimitResult => {
  const now = Date.now();
  prune(now);
  const key = `${options.scope}:${getClientKey(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { hits: 1, resetAt });
    return {
      ok: true,
      remaining: Math.max(0, options.limit - 1),
      resetAt,
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  bucket.hits += 1;
  const remaining = Math.max(0, options.limit - bucket.hits);
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return {
    ok: bucket.hits <= options.limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
};

export const buildRateLimitHeaders = (result: RateLimitResult, limit: number) => ({
  "X-RateLimit-Limit": String(limit),
  "X-RateLimit-Remaining": String(result.remaining),
  "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  ...(result.ok ? {} : { "Retry-After": String(result.retryAfterSeconds) }),
});
