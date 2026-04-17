import { describe, expect, it } from "vitest";
import {
  deriveEventUiFacts,
  deriveFightDisplayState,
  derivePostLockTimerState,
  deriveStickyHeaderSlot,
  isFightTerminal,
  type EventUiFacts,
} from "./event-ui-state";
import type { EventStatus, FightStatus } from "./dev-state-helpers";

// All timestamps relative to this anchor so the matrix is reproducible.
const NOW = new Date("2026-04-17T12:00:00Z").getTime();
const FUTURE = new Date("2026-04-18T12:00:00Z").toISOString(); // now + 1 day
const PAST = new Date("2026-04-17T11:00:00Z").toISOString(); // now - 1h

function makeFight(
  status: FightStatus,
  start_time: string,
  id = "f1",
): { id: string; status: FightStatus; start_time: string } {
  return { id, status, start_time };
}

function makeEvent(status: EventStatus) {
  return { id: "e1", status, date: "2026-04-17", completed_at: null };
}

describe("isFightTerminal", () => {
  it.each([
    ["cancelled", true],
    ["no_contest", true],
    ["upcoming", false],
    ["completed", false],
  ] as const)("status=%s → %s", (status, expected) => {
    expect(isFightTerminal({ status })).toBe(expected);
  });
});

describe("deriveEventUiFacts — 9-cell matrix (event.status × fight timing)", () => {
  // Matrix axes:
  //   eventPhase:   upcoming | live | completed
  //   fight timing: all-future | some-started | all-completed
  //
  // The combined assertion per cell covers firstLockAt, allFightsLocked,
  // hasLiveFight, hasCompletedFight — the full contract of the fact layer.

  const matrix: Array<{
    eventStatus: EventStatus;
    label: string;
    fights: { id: string; status: FightStatus; start_time: string }[];
    expected: Omit<EventUiFacts, "eventPhase">;
  }> = [
    {
      eventStatus: "upcoming",
      label: "all fights future (canonical upcoming)",
      fights: [makeFight("upcoming", FUTURE, "f1"), makeFight("upcoming", FUTURE, "f2")],
      expected: {
        firstLockAt: FUTURE,
        allFightsLocked: false,
        hasLiveFight: false,
        hasCompletedFight: false,
      },
    },
    {
      eventStatus: "upcoming",
      label: "some fights started (Sean's screenshot bug — seed data stale)",
      fights: [makeFight("upcoming", PAST, "f1"), makeFight("upcoming", FUTURE, "f2")],
      expected: {
        firstLockAt: PAST,
        allFightsLocked: false,
        hasLiveFight: true,
        hasCompletedFight: false,
      },
    },
    {
      eventStatus: "upcoming",
      label: "all fights completed (DB inconsistency)",
      fights: [makeFight("completed", PAST, "f1"), makeFight("completed", PAST, "f2")],
      expected: {
        firstLockAt: PAST,
        allFightsLocked: true,
        hasLiveFight: false,
        hasCompletedFight: true,
      },
    },
    {
      eventStatus: "live",
      label: "all fights future (admin flipped live early)",
      fights: [makeFight("upcoming", FUTURE, "f1"), makeFight("upcoming", FUTURE, "f2")],
      expected: {
        firstLockAt: FUTURE,
        allFightsLocked: false,
        hasLiveFight: false,
        hasCompletedFight: false,
      },
    },
    {
      eventStatus: "live",
      label: "some fights started (canonical live)",
      fights: [makeFight("upcoming", PAST, "f1"), makeFight("upcoming", FUTURE, "f2")],
      expected: {
        firstLockAt: PAST,
        allFightsLocked: false,
        hasLiveFight: true,
        hasCompletedFight: false,
      },
    },
    {
      eventStatus: "live",
      label: "all fights completed (event lagging its fights)",
      fights: [makeFight("completed", PAST, "f1"), makeFight("completed", PAST, "f2")],
      expected: {
        firstLockAt: PAST,
        allFightsLocked: true,
        hasLiveFight: false,
        hasCompletedFight: true,
      },
    },
    {
      eventStatus: "completed",
      label: "all fights future (DevPanel fresh-upcoming on completed event)",
      fights: [makeFight("upcoming", FUTURE, "f1"), makeFight("upcoming", FUTURE, "f2")],
      expected: {
        firstLockAt: FUTURE,
        allFightsLocked: false,
        hasLiveFight: false,
        hasCompletedFight: false,
      },
    },
    {
      eventStatus: "completed",
      label: "some fights started (event completed before all fights scored)",
      fights: [makeFight("upcoming", PAST, "f1"), makeFight("completed", PAST, "f2")],
      expected: {
        firstLockAt: PAST,
        allFightsLocked: true,
        hasLiveFight: true,
        hasCompletedFight: true,
      },
    },
    {
      eventStatus: "completed",
      label: "all fights completed (canonical completed)",
      fights: [makeFight("completed", PAST, "f1"), makeFight("completed", PAST, "f2")],
      expected: {
        firstLockAt: PAST,
        allFightsLocked: true,
        hasLiveFight: false,
        hasCompletedFight: true,
      },
    },
  ];

  it.each(matrix)(
    "[$eventStatus / $label]",
    ({ eventStatus, fights, expected }) => {
      const facts = deriveEventUiFacts(makeEvent(eventStatus), fights, NOW);
      expect(facts).toEqual({
        eventPhase: eventStatus,
        ...expected,
      });
    },
  );
});

describe("deriveEventUiFacts — edge cases", () => {
  it("empty fights: firstLockAt is null, allFightsLocked is vacuously true, live+completed flags false", () => {
    const facts = deriveEventUiFacts(makeEvent("upcoming"), [], NOW);
    expect(facts).toEqual({
      eventPhase: "upcoming",
      firstLockAt: null,
      allFightsLocked: true,
      hasLiveFight: false,
      hasCompletedFight: false,
    });
  });

  it("all fights terminal (cancelled + no_contest): firstLockAt null, allFightsLocked true, no live/completed", () => {
    const facts = deriveEventUiFacts(
      makeEvent("completed"),
      [
        makeFight("cancelled", PAST, "f1"),
        makeFight("no_contest", PAST, "f2"),
      ],
      NOW,
    );
    expect(facts.firstLockAt).toBeNull();
    expect(facts.allFightsLocked).toBe(true);
    expect(facts.hasLiveFight).toBe(false);
    expect(facts.hasCompletedFight).toBe(false);
  });

  it("terminal fights are excluded from firstLockAt computation", () => {
    // Cancelled fight has the earliest start_time but should not be
    // picked as the lock anchor. The upcoming fight determines the
    // countdown target.
    const earlyPast = new Date(NOW - 3600_000 * 2).toISOString();
    const laterFuture = new Date(NOW + 3600_000 * 2).toISOString();
    const facts = deriveEventUiFacts(
      makeEvent("upcoming"),
      [
        makeFight("cancelled", earlyPast, "f1"),
        makeFight("upcoming", laterFuture, "f2"),
      ],
      NOW,
    );
    expect(facts.firstLockAt).toBe(laterFuture);
  });

  it("terminal fight with past start_time does NOT make hasLiveFight true", () => {
    const facts = deriveEventUiFacts(
      makeEvent("live"),
      [makeFight("cancelled", PAST, "f1")],
      NOW,
    );
    expect(facts.hasLiveFight).toBe(false);
  });

  it("terminal fights contribute to allFightsLocked (they're never pickable)", () => {
    const facts = deriveEventUiFacts(
      makeEvent("upcoming"),
      [
        makeFight("cancelled", PAST, "f1"),
        makeFight("no_contest", PAST, "f2"),
      ],
      NOW,
    );
    expect(facts.allFightsLocked).toBe(true);
  });

  it("firstLockAt picks the earliest across non-terminal fights", () => {
    const t1 = new Date(NOW + 3600_000).toISOString();
    const t2 = new Date(NOW + 7200_000).toISOString();
    const t3 = new Date(NOW + 1800_000).toISOString(); // earliest
    const facts = deriveEventUiFacts(
      makeEvent("upcoming"),
      [
        makeFight("upcoming", t1, "f1"),
        makeFight("upcoming", t2, "f2"),
        makeFight("upcoming", t3, "f3"),
      ],
      NOW,
    );
    expect(facts.firstLockAt).toBe(t3);
  });

  it("completed fight in the past counts as hasCompletedFight, not hasLiveFight", () => {
    const facts = deriveEventUiFacts(
      makeEvent("completed"),
      [makeFight("completed", PAST, "f1")],
      NOW,
    );
    expect(facts.hasLiveFight).toBe(false);
    expect(facts.hasCompletedFight).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// L2 — UI derivations (thin wrappers)
// ─────────────────────────────────────────────────────────────

function factsFor(
  eventStatus: EventStatus,
  fights: { id: string; status: FightStatus; start_time: string }[],
): EventUiFacts {
  return deriveEventUiFacts(makeEvent(eventStatus), fights, NOW);
}

describe("deriveStickyHeaderSlot — Sean's streak-gating spec", () => {
  it("timer running + streak>0 → countdown (streak suppressed)", () => {
    const facts = factsFor("upcoming", [makeFight("upcoming", FUTURE)]);
    const slot = deriveStickyHeaderSlot(facts, 5, NOW);
    expect(slot).toEqual({ kind: "countdown", targetTime: FUTURE });
  });

  it("timer running + streak=0 → countdown", () => {
    const facts = factsFor("upcoming", [makeFight("upcoming", FUTURE)]);
    expect(deriveStickyHeaderSlot(facts, 0, NOW)).toEqual({
      kind: "countdown",
      targetTime: FUTURE,
    });
  });

  it("live event + timer expired + streak>0 → show streak", () => {
    const facts = factsFor("live", [makeFight("upcoming", PAST)]);
    expect(deriveStickyHeaderSlot(facts, 3, NOW)).toEqual({
      kind: "streak",
      value: 3,
    });
  });

  it("live event + timer expired + streak=0 → empty slot", () => {
    const facts = factsFor("live", [makeFight("upcoming", PAST)]);
    expect(deriveStickyHeaderSlot(facts, 0, NOW)).toEqual({ kind: "none" });
  });

  it("completed event + streak>0 → empty slot (Sean's regression guard)", () => {
    // The bug Sean flagged: streak surfacing on completed events.
    // Spec says streak is only allowed during timer or prediction-
    // locked state, which completed is NOT.
    const facts = factsFor("completed", [makeFight("completed", PAST)]);
    expect(deriveStickyHeaderSlot(facts, 7, NOW)).toEqual({ kind: "none" });
  });

  it("completed event + anonymous viewer (null streak) → empty slot", () => {
    const facts = factsFor("completed", [makeFight("completed", PAST)]);
    expect(deriveStickyHeaderSlot(facts, null, NOW)).toEqual({ kind: "none" });
  });

  it("upcoming event with no fights → empty slot", () => {
    const facts = factsFor("upcoming", []);
    expect(deriveStickyHeaderSlot(facts, 3, NOW)).toEqual({ kind: "none" });
  });

  it("upcoming event with stale start_time (seed data) + streak → show streak (not completed yet)", () => {
    // eventPhase is upcoming but firstLockAt is past. Timer not
    // running. Event not completed. Streak displays — consistent
    // with "prediction locked" state.
    const facts = factsFor("upcoming", [makeFight("upcoming", PAST)]);
    expect(deriveStickyHeaderSlot(facts, 2, NOW)).toEqual({
      kind: "streak",
      value: 2,
    });
  });
});

describe("derivePostLockTimerState — FlipTimer burned-out copy", () => {
  it("live event → 'eventInProgress' message", () => {
    const facts = factsFor("live", [makeFight("upcoming", PAST)]);
    expect(derivePostLockTimerState(facts)).toEqual({
      kind: "burnedOut",
      messageKey: "eventInProgress",
    });
  });

  it("completed event → hide the timer entirely", () => {
    const facts = factsFor("completed", [makeFight("completed", PAST)]);
    expect(derivePostLockTimerState(facts)).toEqual({ kind: "hide" });
  });

  it("upcoming event with past firstLockAt (inconsistent seed) → 'eventStartingSoon' softer copy", () => {
    // Sean's screenshot root cause: upcoming event with stale
    // start_time was saying 'EVENT IN PROGRESS' beside an UPCOMING
    // badge. Now emits the softer copy so the UI doesn't contradict
    // itself — and the inconsistent state is surfaced to the admin
    // via DevPanel rather than rendered as truth to users.
    const facts = factsFor("upcoming", [makeFight("upcoming", PAST)]);
    expect(derivePostLockTimerState(facts)).toEqual({
      kind: "burnedOut",
      messageKey: "eventStartingSoon",
    });
  });
});

describe("deriveFightDisplayState — per-fight state collapse", () => {
  const facts = factsFor("live", [makeFight("upcoming", PAST)]);

  it.each([
    ["cancelled", "cancelled"],
    ["no_contest", "no_contest"],
  ] as const)(
    "terminal status %s is preserved regardless of event phase",
    (status, expected) => {
      const result = deriveFightDisplayState(
        { status, start_time: PAST },
        facts,
        NOW,
      );
      expect(result).toBe(expected);
    },
  );

  it("fight.status=completed → 'completed' (even in live event)", () => {
    expect(
      deriveFightDisplayState(
        { status: "completed", start_time: PAST },
        facts,
        NOW,
      ),
    ).toBe("completed");
  });

  it("event.status=completed overrides upcoming fight status", () => {
    const completedEventFacts = factsFor("completed", [
      makeFight("upcoming", PAST),
    ]);
    expect(
      deriveFightDisplayState(
        { status: "upcoming", start_time: PAST },
        completedEventFacts,
        NOW,
      ),
    ).toBe("completed");
  });

  it("upcoming fight in past → 'live'", () => {
    expect(
      deriveFightDisplayState(
        { status: "upcoming", start_time: PAST },
        facts,
        NOW,
      ),
    ).toBe("live");
  });

  it("upcoming fight in future on live event → 'live' (event is live)", () => {
    expect(
      deriveFightDisplayState(
        { status: "upcoming", start_time: FUTURE },
        facts,
        NOW,
      ),
    ).toBe("live");
  });

  it("upcoming fight in future on upcoming event → 'upcoming'", () => {
    const upcomingFacts = factsFor("upcoming", [makeFight("upcoming", FUTURE)]);
    expect(
      deriveFightDisplayState(
        { status: "upcoming", start_time: FUTURE },
        upcomingFacts,
        NOW,
      ),
    ).toBe("upcoming");
  });

  it("cancelled fight with past start_time on live event → still 'cancelled'", () => {
    // Regression guard: terminal states must survive the
    // `hasStarted` OR path. Without the terminal check first, this
    // would erroneously return 'live'.
    expect(
      deriveFightDisplayState(
        { status: "cancelled", start_time: PAST },
        facts,
        NOW,
      ),
    ).toBe("cancelled");
  });
});
