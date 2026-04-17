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
