import { describe, expect, it } from "vitest";
import {
  DEV_LOCK_NAMESPACES,
  TIMER_PRESETS,
  computeFutureEventDate,
  computeFutureStartTime,
  computePastStartTime,
  computeStartTimeFromMinutes,
  computeTodayEventDate,
  filterKeysByPrefixes,
  isValidSnapshot,
  selectFeaturedEventId,
  selectResettableFightIds,
  selectStartTimePushIds,
  snapshotLocalStorageKey,
  type EventSnapshot,
} from "./dev-state-helpers";

// Fixed reference time: 2026-04-14T09:00:00.000Z
const T0 = Date.UTC(2026, 3, 14, 9, 0, 0);

describe("selectResettableFightIds", () => {
  it("returns only completed fights when reset-flipping to upcoming", () => {
    const ids = selectResettableFightIds([
      { id: "a", status: "completed" },
      { id: "b", status: "upcoming" },
      { id: "c", status: "cancelled" },
      { id: "d", status: "no_contest" },
      { id: "e", status: "completed" },
    ]);
    expect(ids).toEqual(["a", "e"]);
  });

  it("preserves cancelled fights — Sean's bug report 2026-04-14 regression guard", () => {
    // If resetFights flips a cancelled fight back to upcoming, the
    // final-state marker is lost and the UI starts rendering it as
    // an interactive picker card even though it was officially
    // cancelled. This test locks that behavior.
    const ids = selectResettableFightIds([
      { id: "fight-5", status: "cancelled" },
    ]);
    expect(ids).toEqual([]);
  });

  it("preserves no_contest fights for the same reason", () => {
    const ids = selectResettableFightIds([
      { id: "fight-4", status: "no_contest" },
    ]);
    expect(ids).toEqual([]);
  });

  it("handles an empty fight list without throwing", () => {
    expect(selectResettableFightIds([])).toEqual([]);
  });
});

describe("selectStartTimePushIds", () => {
  it("includes upcoming and completed fights", () => {
    const ids = selectStartTimePushIds([
      { id: "a", status: "upcoming" },
      { id: "b", status: "completed" },
    ]);
    expect(ids).toEqual(["a", "b"]);
  });

  it("excludes cancelled and no_contest — start_time is meaningless for final states", () => {
    const ids = selectStartTimePushIds([
      { id: "a", status: "upcoming" },
      { id: "b", status: "cancelled" },
      { id: "c", status: "no_contest" },
      { id: "d", status: "completed" },
    ]);
    expect(ids).toEqual(["a", "d"]);
  });
});

describe("computeFutureEventDate", () => {
  it("returns a YYYY-MM-DD string 7 days in the future by default", () => {
    // T0 = 2026-04-14 → +7 = 2026-04-21
    expect(computeFutureEventDate(T0)).toBe("2026-04-21");
  });

  it("respects a custom daysAhead value", () => {
    expect(computeFutureEventDate(T0, 1)).toBe("2026-04-15");
    expect(computeFutureEventDate(T0, 30)).toBe("2026-05-14");
  });

  it("never returns a past date — regression guard for Sean's bug", () => {
    // The whole point of this helper is to bump event.date to the
    // future when transitioning to upcoming state. A past date here
    // would immediately reintroduce the "끝난 경기 디스플레이" bug.
    const computed = computeFutureEventDate(T0);
    expect(new Date(computed).getTime()).toBeGreaterThan(T0);
  });
});

describe("computeTodayEventDate", () => {
  it("returns today's YYYY-MM-DD for the live transition", () => {
    expect(computeTodayEventDate(T0)).toBe("2026-04-14");
  });
});

describe("computeFutureStartTime", () => {
  it("returns ISO timestamp 24h in the future by default", () => {
    const t = computeFutureStartTime(T0);
    const diff = new Date(t).getTime() - T0;
    expect(diff).toBe(24 * 60 * 60 * 1000);
  });

  it("uses ISO format so Supabase accepts it directly", () => {
    expect(computeFutureStartTime(T0)).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });
});

describe("computePastStartTime", () => {
  it("returns ISO timestamp 60s in the past by default", () => {
    const t = computePastStartTime(T0);
    const diff = T0 - new Date(t).getTime();
    expect(diff).toBe(60 * 1000);
  });

  it("is strictly less than now so `start_time <= now()` derivation fires", () => {
    // This is the belt-and-suspenders guarantee for the Live state
    // flip — if start_time equals now, integer rounding could make
    // `hasStarted` flip-flop between renders. Keeping it strictly
    // in the past closes that race.
    const t = computePastStartTime(T0);
    expect(new Date(t).getTime()).toBeLessThan(T0);
  });
});

describe("selectFeaturedEventId", () => {
  it("returns earliest active (upcoming) event", () => {
    const id = selectFeaturedEventId([
      { id: "a", date: "2026-05-01", status: "upcoming" },
      { id: "b", date: "2026-04-20", status: "upcoming" },
      { id: "c", date: "2026-03-15", status: "completed" },
    ]);
    expect(id).toBe("b"); // earliest active
  });

  it("prefers active over completed regardless of date", () => {
    // Completed event with later date should NOT win over active event
    const id = selectFeaturedEventId([
      { id: "completed-late", date: "2026-12-31", status: "completed" },
      { id: "upcoming-early", date: "2026-01-15", status: "upcoming" },
    ]);
    expect(id).toBe("upcoming-early");
  });

  it("treats live events as active alongside upcoming", () => {
    const id = selectFeaturedEventId([
      { id: "live", date: "2026-04-14", status: "live" },
      { id: "upcoming", date: "2026-04-20", status: "upcoming" },
    ]);
    expect(id).toBe("live"); // earlier date
  });

  it("falls back to latest completed when no active event", () => {
    const id = selectFeaturedEventId([
      { id: "c1", date: "2026-01-01", status: "completed" },
      { id: "c2", date: "2026-03-15", status: "completed" },
      { id: "c3", date: "2026-02-10", status: "completed" },
    ]);
    expect(id).toBe("c2"); // latest completed
  });

  it("returns null for empty list", () => {
    expect(selectFeaturedEventId([])).toBeNull();
  });

  it("matches Sean's 엑소더스 scenario — regression guard", () => {
    // Scenario: crawler pulled 'Exodus' (upcoming, 2026-04-20) AND
    // seed created BC 7/8/9 (all completed, 2026-01/02/03). BC 9 is
    // later than Exodus wait no, Exodus is later. After DevPanel
    // flips BC 9 to upcoming (misaligned), home page's featured is
    // `activeEvents[0]` = EARLIEST active, which could be Exodus.
    // This helper ensures DevPanel targets THE SAME event as home.
    const id = selectFeaturedEventId([
      { id: "bc-7", date: "2026-01-18", status: "completed" },
      { id: "bc-8", date: "2026-02-22", status: "completed" },
      { id: "bc-9", date: "2026-03-15", status: "completed" },
      { id: "exodus", date: "2026-04-20", status: "upcoming" },
    ]);
    expect(id).toBe("exodus");
  });
});

describe("TIMER_PRESETS", () => {
  it("has entries ordered from shortest to longest", () => {
    const minutes = TIMER_PRESETS.map((p) => p.minutes);
    const sorted = [...minutes].sort((a, b) => a - b);
    expect(minutes).toEqual(sorted);
  });

  it("all entries have a Korean label", () => {
    for (const preset of TIMER_PRESETS) {
      expect(preset.label).toMatch(/[가-힣]/);
    }
  });

  it("has unique keys", () => {
    const keys = TIMER_PRESETS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("computeStartTimeFromMinutes", () => {
  it("returns ISO timestamp N minutes in the future for positive values", () => {
    const t30 = computeStartTimeFromMinutes(T0, 30);
    expect(new Date(t30).getTime() - T0).toBe(30 * 60 * 1000);

    const t1h = computeStartTimeFromMinutes(T0, 60);
    expect(new Date(t1h).getTime() - T0).toBe(60 * 60 * 1000);
  });

  it("handles fractional minutes for sub-minute timers", () => {
    // 0.5 minutes = 30 seconds
    const t30s = computeStartTimeFromMinutes(T0, 0.5);
    expect(new Date(t30s).getTime() - T0).toBe(30 * 1000);
  });

  it("returns past timestamp for negative minutes", () => {
    const t = computeStartTimeFromMinutes(T0, -5);
    expect(T0 - new Date(t).getTime()).toBe(5 * 60 * 1000);
  });

  it("each TIMER_PRESET produces a valid future ISO", () => {
    for (const preset of TIMER_PRESETS) {
      const iso = computeStartTimeFromMinutes(T0, preset.minutes);
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(iso).getTime()).toBeGreaterThan(T0);
    }
  });
});

describe("snapshotLocalStorageKey", () => {
  it("produces a namespaced key per event id", () => {
    expect(snapshotLocalStorageKey("event-abc")).toBe(
      "bp.dev.snapshot.v1:event-abc",
    );
  });

  it("different event ids get different keys (no clobber)", () => {
    const k1 = snapshotLocalStorageKey("exodus");
    const k2 = snapshotLocalStorageKey("bc-9");
    expect(k1).not.toBe(k2);
  });
});

describe("isValidSnapshot", () => {
  const validSnapshot: EventSnapshot = {
    event: {
      id: "event-1",
      date: "2026-04-20",
      status: "upcoming",
    },
    fights: [
      {
        id: "fight-1",
        status: "upcoming",
        winner_id: null,
        method: null,
        round: null,
        start_time: "2026-04-20T19:00:00.000Z",
        is_title_fight: true,
        is_main_card: true,
      },
      {
        id: "fight-2",
        status: "cancelled",
        winner_id: null,
        method: null,
        round: null,
        start_time: "2026-04-20T20:00:00.000Z",
        is_title_fight: false,
        is_main_card: false,
      },
    ],
  };

  it("accepts a well-formed snapshot", () => {
    expect(isValidSnapshot(validSnapshot)).toBe(true);
  });

  it("rejects null and non-objects", () => {
    expect(isValidSnapshot(null)).toBe(false);
    expect(isValidSnapshot(undefined)).toBe(false);
    expect(isValidSnapshot("string")).toBe(false);
    expect(isValidSnapshot(42)).toBe(false);
  });

  it("rejects missing event", () => {
    expect(isValidSnapshot({ fights: [] })).toBe(false);
  });

  it("rejects invalid event.status", () => {
    expect(
      isValidSnapshot({
        event: { id: "e", date: "2026-04-20", status: "garbage" },
        fights: [],
      }),
    ).toBe(false);
  });

  it("rejects non-array fights", () => {
    expect(
      isValidSnapshot({
        event: { id: "e", date: "2026-04-20", status: "upcoming" },
        fights: "not-an-array",
      }),
    ).toBe(false);
  });

  it("rejects invalid fight.status", () => {
    expect(
      isValidSnapshot({
        event: { id: "e", date: "2026-04-20", status: "upcoming" },
        fights: [
          {
            id: "f",
            status: "garbage",
            winner_id: null,
            method: null,
            round: null,
            start_time: "2026-04-20T19:00:00.000Z",
            is_title_fight: false,
            is_main_card: false,
          },
        ],
      }),
    ).toBe(false);
  });

  it("accepts all four fight status values", () => {
    for (const status of [
      "upcoming",
      "completed",
      "cancelled",
      "no_contest",
    ] as const) {
      const snap = {
        ...validSnapshot,
        fights: [{ ...validSnapshot.fights[0], status }],
      };
      expect(isValidSnapshot(snap)).toBe(true);
    }
  });

  it("rejects fight with non-string start_time", () => {
    expect(
      isValidSnapshot({
        event: { id: "e", date: "2026-04-20", status: "upcoming" },
        fights: [
          {
            id: "f",
            status: "upcoming",
            winner_id: null,
            method: null,
            round: null,
            start_time: 12345,
            is_title_fight: false,
            is_main_card: false,
          },
        ],
      }),
    ).toBe(false);
  });
});

describe("filterKeysByPrefixes", () => {
  it("returns keys matching any prefix", () => {
    const keys = [
      "bp.onboarding.ringName.v1:abc",
      "bp.onboarding.anonCta.v1",
      "bp.streakPR.v1:abc:5",
      "bp.streakBest.v1:abc",
      "unrelated:key",
      "allPredictedToast:v1:uid:eid",
    ];
    expect(filterKeysByPrefixes(keys, DEV_LOCK_NAMESPACES.onboarding)).toEqual(
      [
        "bp.onboarding.ringName.v1:abc",
        "bp.onboarding.anonCta.v1",
      ],
    );
    expect(filterKeysByPrefixes(keys, DEV_LOCK_NAMESPACES.streakPr)).toEqual([
      "bp.streakPR.v1:abc:5",
      "bp.streakBest.v1:abc",
    ]);
  });

  it("both streakPR.* and streakBest.* must be cleared together — regression guard", () => {
    // If only one namespace were cleared, the baseline would survive
    // (or the lock would survive) and the toast wouldn't re-fire on
    // the next page load. Sean's spec explicitly called this out
    // during Branch 8 round 1.
    expect(DEV_LOCK_NAMESPACES.streakPr).toContain("bp.streakPR.");
    expect(DEV_LOCK_NAMESPACES.streakPr).toContain("bp.streakBest.");
  });

  it("returns an empty array when no keys match", () => {
    expect(filterKeysByPrefixes(["foo", "bar"], ["baz."])).toEqual([]);
  });

  it("returns an empty array when keys list is empty", () => {
    expect(filterKeysByPrefixes([], DEV_LOCK_NAMESPACES.onboarding)).toEqual([]);
  });
});
