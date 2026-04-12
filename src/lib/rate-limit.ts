/**
 * In-memory sliding-window rate limiter.
 * Each limiter instance tracks requests per key (usually user ID).
 * Stale keys are lazily pruned every CLEANUP_EVERY checks.
 *
 * NOTE: Best-effort only — not a security boundary.
 * In serverless / multi-instance deployments each process has its own store,
 * so effective limits scale with instance count. For cost-critical endpoints
 * (e.g. Gemini API), migrate to a shared store (Redis/Upstash) before scaling.
 */

import { NextResponse } from "next/server";

/**
 * Extract the caller's IP address from request headers. Checks the common
 * proxy/CDN headers in priority order: Vercel/nginx `x-forwarded-for` →
 * Cloudflare `cf-connecting-ip` → nginx `x-real-ip`. Falls back to "unknown"
 * so rate-limit keys never become empty strings.
 *
 * Shared across API routes that rate-limit by IP. Do not reimplement this
 * locally — a weaker subset will silently degrade rate-limiting on whichever
 * CDN it misses.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();
  const edgeIp = request.headers.get("cf-connecting-ip")?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return firstForwardedIp || edgeIp || realIp || "unknown";
}

/** Standard 429 response with Retry-After header */
export function rateLimitResponse(resetInSeconds: number) {
  return NextResponse.json(
    { error: `Rate limited. Try again in ${resetInSeconds}s` },
    {
      status: 429,
      headers: { "Retry-After": String(resetInSeconds) },
    },
  );
}

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterOptions {
  /** Max requests allowed within the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

const MAX_KEYS = 10_000;
const CLEANUP_EVERY = 100; // run cleanup every N checks

export function createRateLimiter({ limit, windowSeconds }: RateLimiterOptions) {
  const store = new Map<string, RateLimitEntry>();
  let checkCount = 0;

  function cleanup(now: number, windowMs: number) {
    // Remove keys with no recent timestamps
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      if (entry.timestamps.length === 0) store.delete(key);
    }
    // Hard cap: if still over MAX_KEYS, drop oldest entries
    if (store.size > MAX_KEYS) {
      const excess = store.size - MAX_KEYS;
      const iter = store.keys();
      for (let i = 0; i < excess; i++) {
        const { value } = iter.next();
        if (value) store.delete(value);
      }
    }
  }

  return {
    check(key: string): {
      allowed: boolean;
      remaining: number;
      resetInSeconds: number;
    } {
      const now = Date.now();
      const windowMs = windowSeconds * 1000;

      // Periodic cleanup
      if (++checkCount % CLEANUP_EVERY === 0) cleanup(now, windowMs);

      let entry = store.get(key);
      if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
      }

      // Prune expired timestamps for this key
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

      if (entry.timestamps.length >= limit) {
        const oldest = entry.timestamps[0];
        const resetInSeconds = Math.ceil((oldest + windowMs - now) / 1000);
        return { allowed: false, remaining: 0, resetInSeconds };
      }

      entry.timestamps.push(now);
      return {
        allowed: true,
        remaining: limit - entry.timestamps.length,
        resetInSeconds: windowSeconds,
      };
    },
  };
}
