import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createRateLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { EVENT_TYPES } from "@/lib/analytics";
import type { Json } from "@/types/database";

// Allow generous ingest: 60 events per minute per IP (analytics is bursty on page load)
const analyticsLimiter = createRateLimiter({ limit: 60, windowSeconds: 60 });

// Single source of truth for the accepted event list: derived from the
// EventType union so the client and server can never drift apart.
const VALID_EVENT_TYPES = new Set<string>(EVENT_TYPES);

// Limits on metadata storage. Marketing parameters come from the URL so
// anyone can set them to arbitrary content — we truncate, not reject, so
// a bad param doesn't silently drop the whole event.
const MAX_METADATA_KEYS = 24;
const MAX_STRING_LEN = 512;
const MAX_OBJECT_DEPTH = 3;

/** Recursively clean metadata values before DB insert.
 *  - Strings: truncate to {@link MAX_STRING_LEN}.
 *  - Objects: cap at {@link MAX_OBJECT_DEPTH} and {@link MAX_METADATA_KEYS}.
 *  - Numbers/booleans/null: preserved.
 *  - Anything else (undefined, symbols, functions): dropped.
 */
function sanitizeMetadata(value: unknown, depth = 0): Json {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value as Json;
  }
  if (typeof value === "string") {
    return value.length > MAX_STRING_LEN ? value.slice(0, MAX_STRING_LEN) : value;
  }
  if (depth >= MAX_OBJECT_DEPTH) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_METADATA_KEYS).map((v) => sanitizeMetadata(v, depth + 1));
  }
  if (typeof value === "object") {
    const cleaned: Record<string, Json> = {};
    let count = 0;
    for (const [k, v] of Object.entries(value)) {
      if (count >= MAX_METADATA_KEYS) break;
      // Only allow JSON-safe keys (ASCII printable, no control characters)
      if (!/^[\w.\-:]{1,64}$/.test(k)) continue;
      cleaned[k] = sanitizeMetadata(v, depth + 1);
      count += 1;
    }
    return cleaned;
  }
  return null;
}

export async function POST(request: Request) {
  // Rate limit by IP — uses the shared extractor that handles Vercel/CF/nginx
  // forwarding headers in priority order.
  const { allowed, resetInSeconds } = analyticsLimiter.check(getClientIp(request));
  if (!allowed) {
    return rateLimitResponse(resetInSeconds);
  }

  let body: {
    event_type?: string;
    session_id?: string;
    fight_id?: string | null;
    event_id?: string | null;
    metadata?: Json;
  } = {};

  try {
    body = await request.json();
  } catch {
    // Bad JSON — don't waste DB time, but don't error loudly (analytics is best-effort)
    return new NextResponse(null, { status: 204 });
  }

  const eventType = body.event_type?.trim();
  const sessionId = body.session_id?.trim();

  // Validate required fields
  if (!eventType || !sessionId) {
    return new NextResponse(null, { status: 204 });
  }

  // Reject unknown event types (prevents garbage data and injection)
  if (!VALID_EVENT_TYPES.has(eventType)) {
    return new NextResponse(null, { status: 204 });
  }

  // Resolve the authenticated user via getSession() — this is a LOCAL JWT
  // decode with NO network roundtrip to Supabase Auth. We chose getSession
  // over getUser() here because analytics is best-effort and not a trust
  // boundary: logging an event for a technically-revoked-but-still-cookie'd
  // session is harmless, while the per-event auth roundtrip at 10+ events/
  // session would rapidly exhaust the Supabase Free tier egress budget.
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;

  // Sanitize metadata BEFORE insert to cap attacker-controllable fields
  // (utm_*, referrer, nid, bp_lm). Marketing params come from the URL and
  // can be arbitrarily long or deeply nested if a client is malicious.
  const safeMetadata = sanitizeMetadata(body.metadata ?? {});
  const safeFightId = typeof body.fight_id === "string" && body.fight_id.length <= 64
    ? body.fight_id
    : null;
  const safeEventId = typeof body.event_id === "string" && body.event_id.length <= 64
    ? body.event_id
    : null;
  const safeSessionId = sessionId.slice(0, 128);

  // Insert event. Errors are swallowed — analytics must never cause 5xx.
  try {
    await supabase.from("user_events").insert({
      user_id: userId,
      session_id: safeSessionId,
      event_type: eventType,
      fight_id: safeFightId,
      event_id: safeEventId,
      metadata: safeMetadata ?? ({} as Json),
    });
  } catch {
    // Silent fail — log to Sentry if wired, but don't fail the request
  }

  // Always return 204 No Content — the client must not depend on the response.
  return new NextResponse(null, { status: 204 });
}
