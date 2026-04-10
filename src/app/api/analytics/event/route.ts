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

  // Insert event. Errors are swallowed — analytics must never cause 5xx.
  try {
    await supabase.from("user_events").insert({
      user_id: userId,
      session_id: sessionId,
      event_type: eventType,
      fight_id: body.fight_id ?? null,
      event_id: body.event_id ?? null,
      metadata: body.metadata ?? ({} as Json),
    });
  } catch {
    // Silent fail — log to Sentry if wired, but don't fail the request
  }

  // Always return 204 No Content — the client must not depend on the response.
  return new NextResponse(null, { status: 204 });
}
