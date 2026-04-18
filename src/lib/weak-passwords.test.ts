import { describe, expect, it } from "vitest";
import { isWeakPassword } from "./weak-passwords";

describe("isWeakPassword", () => {
  it("blocks the top breach offenders", () => {
    expect(isWeakPassword("123456")).toBe(true);
    expect(isWeakPassword("password")).toBe(true);
    expect(isWeakPassword("qwerty")).toBe(true);
    expect(isWeakPassword("letmein")).toBe(true);
    expect(isWeakPassword("iloveyou")).toBe(true);
  });

  it("blocks BlackPick-specific obvious guesses", () => {
    expect(isWeakPassword("blackpick")).toBe(true);
    expect(isWeakPassword("blackcombat")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isWeakPassword("Password")).toBe(true);
    expect(isWeakPassword("QWERTY")).toBe(true);
    expect(isWeakPassword("BlackPick")).toBe(true);
  });

  it("trims whitespace", () => {
    expect(isWeakPassword("  123456  ")).toBe(true);
    expect(isWeakPassword("\tpassword\n")).toBe(true);
  });

  it("passes non-blocked passwords", () => {
    expect(isWeakPassword("blackpick2026!")).toBe(false);
    expect(isWeakPassword("Tr0ub4dor&3")).toBe(false);
    expect(isWeakPassword("correct horse battery staple")).toBe(false);
  });

  it("is safe for non-string input at runtime", () => {
    // @ts-expect-error deliberately exercising runtime safety
    expect(isWeakPassword(null)).toBe(false);
    // @ts-expect-error
    expect(isWeakPassword(undefined)).toBe(false);
    // @ts-expect-error
    expect(isWeakPassword(12345)).toBe(false);
  });
});
