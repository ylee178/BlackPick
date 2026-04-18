import { describe, expect, it } from "vitest";
import { resolveDivisionChip } from "./division-chip";

const CHAMPION = "Champion";

describe("resolveDivisionChip — priority + state matrix", () => {
  it("live rank wins over every other signal", () => {
    const chip = resolveDivisionChip(
      { weightClass: "라이트급", rank: 3 },
      { weight_class: "페더급", is_champion: true, rank_position: 1 },
      "en",
      CHAMPION,
    );
    // Live rank: "Lightweight · #3" — champion boolean + rank_position
    // on the fighter row are suppressed, not even considered.
    expect(chip).toEqual({ label: "Lightweight · #3", tone: "ranked" });
  });

  it("falls back to DB champion when live has no rank", () => {
    const chip = resolveDivisionChip(
      null,
      { weight_class: "라이트급", is_champion: true, rank_position: null },
      "en",
      CHAMPION,
    );
    expect(chip).toEqual({ label: "Lightweight · Champion", tone: "champion" });
  });

  it("falls back to DB rank_position when not champion and live is unavailable", () => {
    const chip = resolveDivisionChip(
      null,
      { weight_class: "라이트급", is_champion: false, rank_position: 5 },
      "en",
      CHAMPION,
    );
    expect(chip).toEqual({ label: "Lightweight · #5", tone: "ranked" });
  });

  it("returns null when no ranking signal exists on any source", () => {
    const chip = resolveDivisionChip(
      null,
      { weight_class: "라이트급", is_champion: false, rank_position: null },
      "en",
      CHAMPION,
    );
    expect(chip).toBeNull();
  });

  it("returns null when neither live nor DB provides any rank", () => {
    const chip = resolveDivisionChip(
      null,
      {},
      "en",
      CHAMPION,
    );
    expect(chip).toBeNull();
  });

  it("falls back to DB weight_class when live division is absent", () => {
    const chip = resolveDivisionChip(
      null,
      { weight_class: "라이트급", is_champion: true },
      "en",
      CHAMPION,
    );
    expect(chip?.label).toBe("Lightweight · Champion");
  });

  it("uses live weight class when live has division but no rank (DB fallback for rank)", () => {
    const chip = resolveDivisionChip(
      { weightClass: "라이트급", rank: null },
      { is_champion: true },
      "en",
      CHAMPION,
    );
    // Live's weight class is preferred (more current) even though its
    // rank was null and we fell through to DB for the title.
    expect(chip?.label).toBe("Lightweight · Champion");
  });

  it("champion with no weight class anywhere shows bare championLabel", () => {
    const chip = resolveDivisionChip(
      null,
      { is_champion: true },
      "en",
      CHAMPION,
    );
    expect(chip).toEqual({ label: "Champion", tone: "champion" });
  });

  it("DB rank with no weight class anywhere shows bare rank", () => {
    const chip = resolveDivisionChip(
      null,
      { is_champion: false, rank_position: 7 },
      "en",
      CHAMPION,
    );
    expect(chip).toEqual({ label: "#7", tone: "ranked" });
  });

  it("translates weight class per locale", () => {
    const ko = resolveDivisionChip(
      { weightClass: "라이트급", rank: 2 },
      {},
      "ko",
      "챔피언",
    );
    expect(ko?.label).toBe("라이트급 · #2");
  });

  it("honors passed-in championLabel (driven by caller's i18n)", () => {
    const chip = resolveDivisionChip(
      null,
      { weight_class: "라이트급", is_champion: true },
      "ko",
      "챔피언",
    );
    expect(chip?.label).toBe("라이트급 · 챔피언");
  });

  it("invariant: champion tone never carries a rank number", () => {
    // is_champion=true + rank_position=3 is a forbidden DB state
    // (CHECK constraint in 202604190001 migration). The resolver's
    // priority order still degrades gracefully when that state sneaks
    // through (e.g. a stale row pre-migration): champion wins over
    // rank_position fallback, so rank_position 3 is never surfaced.
    const chip = resolveDivisionChip(
      null,
      { weight_class: "라이트급", is_champion: true, rank_position: 3 },
      "en",
      CHAMPION,
    );
    expect(chip?.tone).toBe("champion");
    expect(chip?.label).toBe("Lightweight · Champion");
    expect(chip?.label).not.toContain("#");
  });
});
