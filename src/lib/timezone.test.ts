import { describe, it, expect } from "vitest";
import {
  buildPreferredTimezoneList,
  formatTimeInTimezone,
  getAllTimezones,
  getTimezoneAbbreviation,
  getTimezoneDisplayName,
} from "./timezone";

describe("buildPreferredTimezoneList", () => {
  it("pins the detected zone first", () => {
    const list = buildPreferredTimezoneList("Australia/Sydney");
    expect(list[0]).toBe("Australia/Sydney");
  });

  it("places Asia/Seoul immediately after detected when they differ", () => {
    const list = buildPreferredTimezoneList("America/Los_Angeles");
    expect(list[0]).toBe("America/Los_Angeles");
    expect(list[1]).toBe("Asia/Seoul");
  });

  it("deduplicates when detected equals Seoul", () => {
    const list = buildPreferredTimezoneList("Asia/Seoul");
    expect(list.filter((z) => z === "Asia/Seoul")).toHaveLength(1);
    expect(list[0]).toBe("Asia/Seoul");
  });

  it("returns a non-empty list that includes Seoul", () => {
    const list = buildPreferredTimezoneList("Pacific/Auckland");
    expect(list.length).toBeGreaterThan(5);
    expect(list).toContain("Asia/Seoul");
    expect(list).toContain("UTC");
  });
});

describe("formatTimeInTimezone", () => {
  const iso = "2026-04-11T06:00:00.000Z"; // Seoul 15:00, Sydney 16:00

  it("renders Seoul local time explicitly", () => {
    const formatted = formatTimeInTimezone(iso, "Asia/Seoul", "en");
    // "Apr 11, 2026, 3:00 PM" or similar — just assert it contains 3
    expect(formatted).toMatch(/3:00/);
  });

  it("renders Sydney local time explicitly", () => {
    const formatted = formatTimeInTimezone(iso, "Australia/Sydney", "en");
    // Sydney is UTC+10 (AEST) in April → 16:00 = 4:00 PM
    expect(formatted).toMatch(/4:00/);
  });

  it("falls back to the ISO string if the timezone is garbage", () => {
    const formatted = formatTimeInTimezone(
      iso,
      "Mars/Olympus_Mons",
      "en",
    );
    expect(formatted).toBe(iso);
  });
});

describe("getTimezoneDisplayName", () => {
  it("produces a readable label for Asia/Seoul", () => {
    const name = getTimezoneDisplayName("Asia/Seoul", "en");
    expect(name).toContain("Seoul");
  });

  it("produces a readable label for Australia/Sydney", () => {
    const name = getTimezoneDisplayName("Australia/Sydney", "en");
    expect(name).toContain("Sydney");
  });

  it("does not crash on unknown timezones", () => {
    // Unknown zone → Intl throws internally, we fall back to the city part.
    const name = getTimezoneDisplayName("Mars/Olympus_Mons", "en");
    expect(name).toContain("Olympus Mons");
  });
});

describe("getTimezoneAbbreviation", () => {
  it("returns KST-ish abbreviation for Asia/Seoul", () => {
    const abbr = getTimezoneAbbreviation("Asia/Seoul", "en");
    // Different runtimes may return "KST" or "GMT+9" — assert non-empty.
    expect(abbr.length).toBeGreaterThan(0);
  });

  it("returns empty string for unknown tz instead of throwing", () => {
    expect(() => getTimezoneAbbreviation("Mars/Olympus_Mons", "en")).not.toThrow();
  });
});

describe("getAllTimezones", () => {
  it("returns a non-empty list", () => {
    const all = getAllTimezones();
    expect(all.length).toBeGreaterThan(10);
    expect(all).toContain("Asia/Seoul");
    expect(all).toContain("UTC");
  });
});
