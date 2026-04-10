import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";

// Allow generous ingest: 60 events per minute per IP (analytics is bursty on page load)
const analyticsLimiter = createRateLimiter({ limit: 60, windowSeconds: 60 });

// P0 event types — only these are accepted. Expand as P1/P2 events are added.
const VALID_EVENT_TYPES = new Set([
  "session_start",
  "page_view",
  "prediction_flow_entered",
  "prediction_winner_selected",
  "prediction_method_selected",
  "prediction_round_selected",
  "prediction_submitted",
  "signup_completed",
  "login_completed",
]);

function getRateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: Request) {
  // Rate limit by IP
  const { allowed, resetInSeconds } = analyticsLimiter.check(getRateLimitKey(request));
  if (!allowed) {
    return rateLimitResponse(resetInSeconds);
  }

  let body: {
    event_type?: string;
    session_id?: string;
    fight_id?: string | null;
    event_id?: string | null;
    metadata?: Record<string, unknown>;
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

  // Optional: grab the authenticated user (if available) for richer analytics.
  // We use getUser() which reads the session cookie — cheap, no extra DB call.
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Insert event. Errors are swallowed — analytics must never cause 5xx.
  try {
    await supabase.from("user_events").insert({
      user_id: user?.id ?? null,
      session_id: sessionId,
      event_type: eventType,
      fight_id: body.fight_id ?? null,
      event_id: body.event_id ?? null,
      metadata: body.metadata ?? {},
    });
  } catch {
    // Silent fail — log to Sentry if wired, but don't fail the request
  }

  // Always return 204 No Content — the client must not depend on the response.
  return new NextResponse(null, { status: 204 });
}
