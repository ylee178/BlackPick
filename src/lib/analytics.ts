/**
 * Client-side analytics utility — fire-and-forget event logging.
 *
 * Design principles (from the analytics spec):
 * 1. Never block or break UX — all errors are swallowed
 * 2. Session ID lives in sessionStorage (survives in-tab navigation, resets on new tab)
 * 3. Events are sent via fetch with keepalive so they survive page unload
 * 4. EventType is typed for the P0 critical subset; expand as P1/P2 events are added
 */

// P0 critical event subset — 9 events that must be captured at launch.
// More event types will be added in P1 (comments, MVP, rankings, etc.)
export type EventType =
  | "session_start"
  | "page_view"
  | "prediction_flow_entered"
  | "prediction_winner_selected"
  | "prediction_method_selected"
  | "prediction_round_selected"
  | "prediction_submitted"
  | "signup_completed"
  | "login_completed";

const SESSION_STORAGE_KEY = "bp_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";

  try {
    let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage blocked (incognito/privacy settings)
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

type LogEventContext = {
  fightId?: string;
  eventId?: string;
};

/**
 * Log a single analytics event. Fire-and-forget — never throws, never blocks.
 *
 * @param eventType - one of the typed EventType values
 * @param metadata  - arbitrary JSON-safe key-value pairs
 * @param context   - optional fight/event IDs for efficient DB indexing
 */
export function logEvent(
  eventType: EventType,
  metadata: Record<string, unknown> = {},
  context?: LogEventContext,
): void {
  // Guard: don't fire on SSR or during build
  if (typeof window === "undefined") return;

  try {
    const body = JSON.stringify({
      event_type: eventType,
      session_id: getSessionId(),
      fight_id: context?.fightId ?? null,
      event_id: context?.eventId ?? null,
      metadata,
    });

    // keepalive: true ensures the request survives page navigation/close.
    // navigator.sendBeacon is an alternative but doesn't support custom headers.
    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Silent fail — analytics must never affect UX
    });
  } catch {
    // Silent fail
  }
}
