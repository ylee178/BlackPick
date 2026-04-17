import { describe, expect, it } from "vitest";
import {
  EXODUS_ANCHOR_DATE,
  filterUserVisibleEvents,
  isUserVisibleEvent,
} from "./event-visibility";

describe("EXODUS_ANCHOR_DATE", () => {
  it("is the canonical 2026-01-31 block-on-Exodus-day date (Sean 2026-04-17 spec)", () => {
    expect(EXODUS_ANCHOR_DATE).toBe("2026-01-31");
  });
});

describe("isUserVisibleEvent", () => {
  it("date on the anchor (Exodus itself) is visible — inclusive boundary", () => {
    expect(isUserVisibleEvent({ date: "2026-01-31" })).toBe(true);
  });

  it("date one day before the anchor is hidden", () => {
    expect(isUserVisibleEvent({ date: "2026-01-30" })).toBe(false);
  });

  it("date well after the anchor is visible", () => {
    expect(isUserVisibleEvent({ date: "2026-04-17" })).toBe(true);
  });

  it("date well before the anchor is hidden", () => {
    expect(isUserVisibleEvent({ date: "2025-12-01" })).toBe(false);
  });

  it("tolerates extra fields on the input (e.g. full EventRow)", () => {
    const row = {
      id: "abc",
      name: "블랙컴뱃 16: EXODUS",
      date: "2026-01-31",
      status: "completed" as const,
    };
    expect(isUserVisibleEvent(row)).toBe(true);
  });
});

describe("filterUserVisibleEvents", () => {
  it("drops pre-Exodus rows and preserves order of remaining", () => {
    const input = [
      { id: "1", date: "2025-11-01" },
      { id: "2", date: "2026-01-15" },
      { id: "3", date: "2026-01-31" },
      { id: "4", date: "2026-02-14" },
      { id: "5", date: "2026-03-20" },
    ];
    expect(filterUserVisibleEvents(input)).toEqual([
      { id: "3", date: "2026-01-31" },
      { id: "4", date: "2026-02-14" },
      { id: "5", date: "2026-03-20" },
    ]);
  });

  it("returns [] when all rows are pre-Exodus", () => {
    const input = [
      { id: "1", date: "2025-11-01" },
      { id: "2", date: "2026-01-15" },
    ];
    expect(filterUserVisibleEvents(input)).toEqual([]);
  });

  it("returns a copy when all rows are visible (doesn't mutate input)", () => {
    const input = [
      { id: "1", date: "2026-02-01" },
      { id: "2", date: "2026-03-01" },
    ];
    const result = filterUserVisibleEvents(input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });

  it("handles empty input", () => {
    expect(filterUserVisibleEvents([])).toEqual([]);
  });
});
