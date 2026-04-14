/**
 * Pure helpers for the DevPanel's event/fight state transitions.
 *
 * These are extracted into a separate file so they can be unit tested
 * without mocking Supabase. The seed route imports these and wraps
 * them with the admin client calls.
 *
 * Rules captured here:
 *
 *  1. **Cancelled / no_contest fights are final states** and must be
 *     preserved across DevPanel state flips. Sean's "끝난 경기가
 *     upcoming에 디스플레이" bug was partly caused by resetFights
 *     flipping cancelled fights to upcoming, losing the final-state
 *     marker.
 *
 *  2. **Event.date must match the state semantically**. An "upcoming"
 *     event with a past date reads as "finished" in the hero's
 *     EventDateLine — Sean's primary complaint.
 *
 *  3. **Fight.start_time must match the state semantically**.
 *     Upcoming → future (so countdown timer counts down). Live → past
 *     (so sub-header timer expires and streak indicator appears).
 *     Completed → unchanged (display is driven by fight.status
 *     regardless of start_time).
 */

export type FightStatus = "upcoming" | "completed" | "cancelled" | "no_contest";
export type EventStatus = "upcoming" | "live" | "completed";

/**
 * Home page's "featured event" selection — the same logic used by
 * `src/app/[locale]/(main)/page.tsx` at render time. Extracted here
 * so DevPanel can target the SAME event the user sees on the home
 * page. Without this alignment, DevPanel's `latest by date desc`
 * could target a different event than the home page's `activeEvents[0]`
 * (earliest active), causing state flips to invisibly hit the wrong
 * row. Sean's 2026-04-14 "엑소더스에서 안바껴" report traced back to
 * this mismatch.
 *
 * Selection rule (mirrors page.tsx:74-77):
 *   1. Prefer the earliest active (live or upcoming) event
 *   2. Fall back to the most recent completed event
 *   3. Return null if neither exists
 *
 * @param events — events fetched with any ordering. Internally sorts.
 */
export function selectFeaturedEventId<
  T extends { id: string; date: string; status: EventStatus },
>(events: T[]): string | null {
  const sortedAsc = [...events].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const firstActive = sortedAsc.find(
    (e) => e.status === "live" || e.status === "upcoming",
  );
  if (firstActive) return firstActive.id;

  const sortedDesc = [...events].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const latestCompleted = sortedDesc.find((e) => e.status === "completed");
  return latestCompleted?.id ?? null;
}

/**
 * Returns fights that are eligible to be flipped to "upcoming" by a
 * reset operation. Final states (cancelled, no_contest) are
 * intentionally excluded — those are terminal and should not be
 * reverted.
 *
 * Upcoming fights are excluded because they're already in the target
 * state (no-op update). Only completed fights actually need flipping.
 */
export function selectResettableFightIds<
  T extends { id: string; status: FightStatus },
>(fights: T[]): string[] {
  return fights
    .filter(
      (f) =>
        f.status !== "cancelled" &&
        f.status !== "no_contest" &&
        f.status !== "upcoming",
    )
    .map((f) => f.id);
}

/**
 * Returns fight IDs eligible for the start_time push in the upcoming
 * state. Final-state fights (cancelled, no_contest) are preserved
 * untouched — they have no meaningful start_time value and should
 * not be manipulated.
 */
export function selectStartTimePushIds<
  T extends { id: string; status: FightStatus },
>(fights: T[]): string[] {
  return fights
    .filter((f) => f.status !== "cancelled" && f.status !== "no_contest")
    .map((f) => f.id);
}

/**
 * ISO date string for an event.date column (YYYY-MM-DD).
 *
 * Used by setEventStatus to bump the event.date when transitioning
 * to upcoming — otherwise the hero shows a stale past date while
 * the event row is technically in upcoming state, which reads as
 * "finished event" and was the root cause of Sean's bug report.
 */
export function computeFutureEventDate(nowMs: number, daysAhead = 7): string {
  return new Date(nowMs + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/**
 * ISO date for "today" — used when transitioning an event to live
 * so the hero's EventDateLine matches the semantic state.
 */
export function computeTodayEventDate(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * Full ISO timestamp for a fight.start_time column.
 */
export function computeFutureStartTime(nowMs: number, hoursAhead = 24): string {
  return new Date(nowMs + hoursAhead * 60 * 60 * 1000).toISOString();
}

/**
 * DevPanel "mock timer" presets — Sean-selectable countdown durations
 * so he can visually test the timer at different states (seconds out
 * before lock, an hour out, a day out, etc.) without waiting for real
 * time to pass.
 *
 * Each entry is a minutes-ahead value that gets added to `Date.now()`
 * and written to `fight.start_time`. The DevPanel renders these as
 * preset buttons next to the 이벤트 상태 section.
 */
export const TIMER_PRESETS = [
  { key: "30s", label: "30초 후", minutes: 0.5 },
  { key: "5min", label: "5분 후", minutes: 5 },
  { key: "1h", label: "1시간 후", minutes: 60 },
  { key: "3h", label: "3시간 후", minutes: 180 },
  { key: "1d", label: "1일 후", minutes: 60 * 24 },
] as const;

export type TimerPresetKey = (typeof TIMER_PRESETS)[number]["key"];

/**
 * Converts a minutes-ahead value to an ISO start_time string.
 * Negative minutes values produce a past timestamp (used by the
 * Live preset to force `hasStarted = true`).
 */
export function computeStartTimeFromMinutes(
  nowMs: number,
  minutesAhead: number,
): string {
  return new Date(nowMs + minutesAhead * 60 * 1000).toISOString();
}

/**
 * Past timestamp used when transitioning to live — just past enough
 * that `start_time <= now()` evaluates true so the sub-header timer
 * expires and the UI derives `hasStarted = true`.
 */
export function computePastStartTime(nowMs: number, secondsAgo = 60): string {
  return new Date(nowMs - secondsAgo * 1000).toISOString();
}

/**
 * Returns the localStorage key namespaces used by DevPanel's various
 * reset operations. Keeping them in one place ensures Reset Locks
 * actions and the components that read them stay in sync.
 */
export const DEV_LOCK_NAMESPACES = {
  allPredictedToastPrefix: "allPredictedToast:v1:",
  onboarding: ["bp.onboarding."],
  streakPr: ["bp.streakPR.", "bp.streakBest."],
} as const;

/**
 * Pure helper: given a list of localStorage keys, returns the ones
 * matching any of the provided prefixes. Used to preview what a
 * reset action would clear (and as a testable core for the actual
 * removal loop).
 */
export function filterKeysByPrefixes(
  keys: string[],
  prefixes: readonly string[],
): string[] {
  return keys.filter((k) => prefixes.some((p) => k.startsWith(p)));
}

/**
 * Event snapshot shape used by DevPanel's sandbox mode. When Sean
 * picks an event from the DevPanel, the current event row + all its
 * fights are captured as a snapshot. All subsequent DevPanel
 * mutations (state flips, timer, presets, content flags) apply to
 * the real DB. The "리셋" button restores the DB back to this
 * snapshot — Sean's 2026-04-14 sandbox mental model.
 *
 * Schema-minimal: only the fields DevPanel can mutate are captured.
 * Other columns (id, fighter_a_id, fighter_b_id) are unchanged by
 * DevPanel so don't need to be in the snapshot.
 */
export type EventSnapshot = {
  event: {
    id: string;
    date: string;
    status: EventStatus;
  };
  fights: Array<{
    id: string;
    status: FightStatus;
    winner_id: string | null;
    method: string | null;
    round: number | null;
    start_time: string;
    is_title_fight: boolean | null;
    is_main_card: boolean | null;
  }>;
};

/**
 * localStorage key for storing a per-event snapshot so the sandbox
 * survives page reloads. One key per event id — picking a different
 * event doesn't clobber the prior snapshot (Sean can switch back).
 */
export function snapshotLocalStorageKey(eventId: string): string {
  return `bp.dev.snapshot.v1:${eventId}`;
}

/**
 * Validates that an arbitrary JSON value is a well-formed snapshot.
 * Used when rehydrating from localStorage on DevPanel mount — stale
 * or corrupted snapshots from older DevPanel versions should fail
 * silently rather than crash the panel.
 */
export function isValidSnapshot(value: unknown): value is EventSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  if (typeof s.event !== "object" || s.event === null) return false;
  const event = s.event as Record<string, unknown>;
  if (
    typeof event.id !== "string" ||
    typeof event.date !== "string" ||
    (event.status !== "upcoming" &&
      event.status !== "live" &&
      event.status !== "completed")
  ) {
    return false;
  }
  if (!Array.isArray(s.fights)) return false;
  for (const f of s.fights) {
    if (typeof f !== "object" || f === null) return false;
    const fight = f as Record<string, unknown>;
    if (typeof fight.id !== "string") return false;
    if (
      fight.status !== "upcoming" &&
      fight.status !== "completed" &&
      fight.status !== "cancelled" &&
      fight.status !== "no_contest"
    ) {
      return false;
    }
    if (typeof fight.start_time !== "string") return false;
  }
  return true;
}
