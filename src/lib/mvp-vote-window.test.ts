import { describe, expect, it } from "vitest";
import { getMvpVotingDeadline } from "./mvp-vote-window";

describe("getMvpVotingDeadline", () => {
  it("uses completed_at when present", () => {
    expect(
      getMvpVotingDeadline("2026-04-17", "2026-04-17T15:30:00.000Z").toISOString(),
    ).toBe("2026-04-18T15:30:00.000Z");
  });

  it("preserves future completed_at anchors without clamping them back to the event date", () => {
    expect(
      getMvpVotingDeadline("2026-04-17", "2026-04-18T02:00:00.000Z").toISOString(),
    ).toBe("2026-04-19T02:00:00.000Z");
  });

  it("falls back to the end of the Korea-local event day for legacy rows", () => {
    expect(
      getMvpVotingDeadline("2026-04-17", null).toISOString(),
    ).toBe("2026-04-18T14:59:59.999Z");
  });

  it("throws on invalid fallback event dates", () => {
    expect(() => getMvpVotingDeadline("2026/04/17", null)).toThrow();
  });
});
