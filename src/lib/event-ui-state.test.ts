import { describe, expect, it } from "vitest";
import {
  deriveEventUiFacts,
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
