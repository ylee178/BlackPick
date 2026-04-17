/**
 * Low-level "facts" about an event's display state.
 *
 * Sean + Codex 2026-04-17 plan: the page used to derive event/fight
 * state from three independent signals (`event.status`, `fight.start_time`,
 * `fight.status`) in ad-hoc combinations across components, producing
 * contradictory UI — e.g., an UPCOMING badge next to a 00:00:00 timer
 * next to "EVENT IN PROGRESS" text next to "Predictions locked".
 *
 * This helper returns only FACTS, not UI decisions. Consumers build
 * thin UI derivations on top (header copy, fight overlay, share CTA).
 * Keeping the fact layer UI-agnostic means a new UI surface doesn't
 * force the fact layer to grow a new boolean — and changes to UI
 * copy/layout don't force the fact layer to change.
 *
 * See `Docs/plans/2026-04-17-event-state-unify-and-testing.md` for
 * the two-layer structure + screenshot of the original bug.
 */

import type { EventStatus, FightStatus } from "./dev-state-helpers";

/**
 * Terminal fight statuses — once set, these are not timer-driven and
 * must be preserved across DevPanel resets + never be considered
 * "live" regardless of the start_time value.
 */
const TERMINAL_FIGHT_STATUSES: readonly FightStatus[] = [
  "cancelled",
  "no_contest",
] as const;

export function isFightTerminal(fight: { status: FightStatus }): boolean {
  return TERMINAL_FIGHT_STATUSES.includes(fight.status);
}

type EventInput = {
  id?: string;
  status: EventStatus;
  date?: string;
  completed_at?: string | null;
};

type FightInput = {
  id?: string;
  status: FightStatus;
  start_time: string;
};

export type EventUiFacts = {
  /**
   * Source of truth for labels, hero copy, and badges.
   * Always equals `event.status` — never overridden by fight signals.
   */
  eventPhase: EventStatus;

  /**
   * Earliest `start_time` across non-terminal fights, ISO string.
   * `null` when every fight is terminal or the event has no fights.
   *
   * Used by the sub-header countdown target and the "predictions
   * lock at" copy. Not used for phase derivation — `eventPhase` is.
   */
  firstLockAt: string | null;

  /**
   * True when every fight either is terminal or has a `start_time`
   * at or before `now`. In DevPanel terms: the pick window is
   * closed for every remaining (non-terminal) fight.
   *
   * Vacuously true when fights is empty — matches the semantic
   * "nothing left pickable".
   */
  allFightsLocked: boolean;

  /**
   * True when at least one non-terminal fight has started
   * (`start_time <= now`) but is not yet completed.
   */
  hasLiveFight: boolean;

  /**
   * True when at least one fight is in `completed` status.
   * Useful for "results are in" affordances that shouldn't
   * wait for the event-level transition.
   */
  hasCompletedFight: boolean;
};

/**
 * Returns only fact-level state. UI derivations (showStreak,
 * fightDisplayState, shareState, etc.) belong in per-surface
 * helpers that compose on top of this.
 *
 * @param event — at minimum `{ status }`. Other fields are tolerated
 *   for ergonomic callsite usage but not read by this helper.
 * @param fights — may be empty. Terminal fights are excluded from
 *   the timing computations but still contribute to `allFightsLocked`.
 * @param now — current epoch ms. Passed in (not `Date.now()` read
 *   directly) so tests can pin time and consumers can share a
 *   single clock tick across multiple derivations.
 */
export function deriveEventUiFacts(
  event: EventInput,
  fights: readonly FightInput[],
  now: number,
): EventUiFacts {
  const nonTerminal = fights.filter((f) => !isFightTerminal(f));

  const firstLockAt =
    nonTerminal.length > 0
      ? nonTerminal.reduce((earliest, f) => {
          const fMs = new Date(f.start_time).getTime();
          const earliestMs = new Date(earliest).getTime();
          return fMs < earliestMs ? f.start_time : earliest;
        }, nonTerminal[0].start_time)
      : null;

  const allFightsLocked = fights.every(
    (f) => isFightTerminal(f) || new Date(f.start_time).getTime() <= now,
  );

  const hasLiveFight = fights.some(
    (f) =>
      !isFightTerminal(f) &&
      f.status !== "completed" &&
      new Date(f.start_time).getTime() <= now,
  );

  const hasCompletedFight = fights.some((f) => f.status === "completed");

  return {
    eventPhase: event.status,
    firstLockAt,
    allFightsLocked,
    hasLiveFight,
    hasCompletedFight,
  };
}

// ─────────────────────────────────────────────────────────────
// L2 — thin UI-specific derivations on top of EventUiFacts
//
// Each helper picks the small subset of facts relevant to its
// surface and returns a state shape that maps directly to the
// rendering component. Keep them pure, keep them small, and
// NEVER reach around facts back to the raw event/fight rows.
// ─────────────────────────────────────────────────────────────

/**
 * Sticky sub-header right-slot state.
 *
 * Spec (Sean 2026-04-17): streak only shown in timer-active OR
 * prediction-locked state, NOT after the event completes.
 *
 * - Timer still running → countdown takes the slot.
 * - Timer expired AND event not yet marked completed AND user has
 *   streak ≥ 1 → show streak.
 * - Event completed → empty slot (results are in; streak isn't
 *   contextually relevant here and Sean found it visually noisy).
 */
export type StickyHeaderSlot =
  | { kind: "countdown"; targetTime: string }
  | { kind: "streak"; value: number }
  | { kind: "none" };

export function deriveStickyHeaderSlot(
  facts: Pick<EventUiFacts, "eventPhase" | "firstLockAt">,
  currentStreak: number | null,
  now: number,
): StickyHeaderSlot {
  const firstLockMs = facts.firstLockAt
    ? new Date(facts.firstLockAt).getTime()
    : null;
  const timerRunning = firstLockMs !== null && firstLockMs > now;

  if (timerRunning && facts.firstLockAt) {
    return { kind: "countdown", targetTime: facts.firstLockAt };
  }

  // Streak shows only in the "prediction locked" state — which
  // requires an actual non-terminal fight to exist. Empty events
  // or all-terminal events don't qualify (there's nothing to be
  // locked on).
  const streak = currentStreak ?? 0;
  if (
    streak > 0 &&
    facts.eventPhase !== "completed" &&
    facts.firstLockAt !== null
  ) {
    return { kind: "streak", value: streak };
  }

  return { kind: "none" };
}

/**
 * FlipTimer's post-lock message.
 *
 * Before: when `tl.total <= 0` the hero always rendered
 * `countdown.eventInProgress` regardless of the event's actual
 * phase. For an `upcoming` event with stale seed `start_time`s
 * this produced "EVENT IN PROGRESS" next to an UPCOMING badge.
 *
 * After: honor `eventPhase` when choosing the post-lock copy.
 * Returning `null` tells the hero to unmount the timer entirely
 * (used for completed events — a burned-out timer on a finished
 * card is just noise).
 */
export type PostLockTimerState =
  | { kind: "hide" }
  | { kind: "burnedOut"; messageKey: "eventInProgress" | "eventStartingSoon" };

export function derivePostLockTimerState(
  facts: EventUiFacts,
): PostLockTimerState {
  if (facts.eventPhase === "completed") return { kind: "hide" };
  if (facts.eventPhase === "live")
    return { kind: "burnedOut", messageKey: "eventInProgress" };
  // eventPhase === "upcoming" with firstLockAt past: seed/data
  // state out of sync. Show a softer "starting soon" copy instead
  // of asserting the event is already in progress.
  return { kind: "burnedOut", messageKey: "eventStartingSoon" };
}

/**
 * Per-fight display state used by FightCard + related summaries.
 * Collapses the fight-level status with the event-level phase so
 * callers never have to re-reconcile the two.
 *
 * Order of precedence:
 *   1. Terminal fight status (cancelled / no_contest) — never
 *      overridden. Preserves admin-ruled outcomes.
 *   2. Fight.status === "completed" — result is in for this fight.
 *   3. Event has completed — treat any remaining fight as completed
 *      for display (event-lagging case: admin marked event done
 *      before scoring every fight).
 *   4. Fight started OR event flipped to live — "live".
 *   5. Default — "upcoming".
 */
export type FightDisplayState =
  | "upcoming"
  | "live"
  | "completed"
  | "cancelled"
  | "no_contest";

export function deriveFightDisplayState(
  fight: { status: FightStatus; start_time: string },
  facts: EventUiFacts,
  now: number,
): FightDisplayState {
  if (isFightTerminal(fight)) return fight.status as "cancelled" | "no_contest";
  if (fight.status === "completed") return "completed";
  if (facts.eventPhase === "completed") return "completed";
  const hasStarted = new Date(fight.start_time).getTime() <= now;
  if (hasStarted || facts.eventPhase === "live") return "live";
  return "upcoming";
}
