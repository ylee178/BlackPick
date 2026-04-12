import { describe, it, expect } from "vitest";
import {
  parseKstDatetimeLocalToUtcIso,
  utcIsoToKstDateString,
  formatKstPreview,
} from "./kst-datetime";

describe("parseKstDatetimeLocalToUtcIso", () => {
  it("converts KST 15:00 to 06:00 UTC", () => {
    expect(parseKstDatetimeLocalToUtcIso("2026-04-11T15:00")).toBe(
      "2026-04-11T06:00:00.000Z",
    );
  });

  it("crosses a day boundary when KST morning equals previous-day UTC", () => {
    // KST 05:00 on 2026-04-11 = UTC 20:00 on 2026-04-10
    expect(parseKstDatetimeLocalToUtcIso("2026-04-11T05:00")).toBe(
      "2026-04-10T20:00:00.000Z",
    );
  });

  it("handles optional seconds", () => {
    expect(parseKstDatetimeLocalToUtcIso("2026-04-11T15:30:45")).toBe(
      "2026-04-11T06:30:45.000Z",
    );
  });

  it("handles month/year boundaries", () => {
    // KST 08:30 on 2026-01-01 = UTC 23:30 on 2025-12-31
    expect(parseKstDatetimeLocalToUtcIso("2026-01-01T08:30")).toBe(
      "2025-12-31T23:30:00.000Z",
    );
  });

  it("is stable regardless of the host timezone (the whole point)", () => {
    // The point of the manual Date.UTC() construction is that it does not
    // depend on `new Date(naiveString)` auto-interpreting the local TZ.
    const a = parseKstDatetimeLocalToUtcIso("2026-06-15T20:00");
    const b = parseKstDatetimeLocalToUtcIso("2026-06-15T20:00");
    expect(a).toBe(b);
    expect(a).toBe("2026-06-15T11:00:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(() => parseKstDatetimeLocalToUtcIso("not-a-date")).toThrow();
    expect(() => parseKstDatetimeLocalToUtcIso("2026-04-11 15:00")).toThrow();
    expect(() => parseKstDatetimeLocalToUtcIso("")).toThrow();
  });

  it("rejects out-of-range month/day/hour/minute", () => {
    // `Date.UTC` would silently normalize these; we catch them first.
    expect(() => parseKstDatetimeLocalToUtcIso("2026-13-01T00:00")).toThrow();
    expect(() => parseKstDatetimeLocalToUtcIso("2026-00-01T00:00")).toThrow();
    expect(() => parseKstDatetimeLocalToUtcIso("2026-04-32T00:00")).toThrow();
    expect(() => parseKstDatetimeLocalToUtcIso("2026-04-11T24:00")).toThrow();
    expect(() => parseKstDatetimeLocalToUtcIso("2026-04-11T15:60")).toThrow();
  });

  it("rejects impossible calendar dates like Feb 31 that Date.UTC would roll forward", () => {
    expect(() => parseKstDatetimeLocalToUtcIso("2026-02-31T15:00")).toThrow();
    expect(() => parseKstDatetimeLocalToUtcIso("2026-04-31T15:00")).toThrow();
    // Non-leap year Feb 29
    expect(() => parseKstDatetimeLocalToUtcIso("2026-02-29T15:00")).toThrow();
  });

  it("accepts a valid leap-year Feb 29", () => {
    // 2028 is a leap year. KST 15:00 → UTC 06:00
    expect(parseKstDatetimeLocalToUtcIso("2028-02-29T15:00")).toBe(
      "2028-02-29T06:00:00.000Z",
    );
  });
});

describe("utcIsoToKstDateString", () => {
  it("returns the Korea-local calendar date for a UTC instant", () => {
    // KST 15:00 on 2026-04-11 = UTC 06:00 on 2026-04-11
    expect(utcIsoToKstDateString("2026-04-11T06:00:00.000Z")).toBe(
      "2026-04-11",
    );
  });

  it("rolls forward when UTC is late evening and KST is the next day", () => {
    // KST 07:00 on 2026-04-12 = UTC 22:00 on 2026-04-11
    expect(utcIsoToKstDateString("2026-04-11T22:00:00.000Z")).toBe(
      "2026-04-12",
    );
  });

  it("rolls back across month boundaries", () => {
    // KST 08:00 on 2026-05-01 = UTC 23:00 on 2026-04-30
    expect(utcIsoToKstDateString("2026-04-30T23:00:00.000Z")).toBe(
      "2026-05-01",
    );
  });

  it("throws on invalid input", () => {
    expect(() => utcIsoToKstDateString("definitely not an iso string")).toThrow();
  });
});

describe("formatKstPreview", () => {
  it("renders a KST wall-clock preview", () => {
    expect(formatKstPreview("2026-04-11T06:00:00.000Z")).toBe(
      "2026-04-11 15:00 KST",
    );
  });

  it("returns empty string for invalid input", () => {
    expect(formatKstPreview("not-an-iso")).toBe("");
  });
});
