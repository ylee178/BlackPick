import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => {
  const get = vi.fn();
  const create = vi.fn(() => ({ get }));
  return { default: { create, get }, create };
});

// eslint-disable-next-line import/first, import/order
import axios from "axios";
// eslint-disable-next-line import/first, import/order
import { _resetScoreCardCache, type BcOfficialFight } from "./bc-official";
// eslint-disable-next-line import/first, import/order
import {
  resolveScoreCardsByDbFightId,
  type DbFightForScoreCard,
} from "./bc-scorecards";

function getMockClientGet(): ReturnType<typeof vi.fn> {
  const mockedAxios = axios as unknown as { create: ReturnType<typeof vi.fn> };
  return mockedAxios.create.mock.results[0].value.get;
}

// ─────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────

function makeDbFight(
  overrides: Partial<DbFightForScoreCard> & { id: string },
): DbFightForScoreCard {
  return {
    method: "Decision",
    fighter_a: { name: "Mammoth", name_en: "Mammoth", name_ko: "맘모스", ring_name: null },
    fighter_b: { name: "Jackpot", name_en: "Jackpot", name_ko: null, ring_name: null },
    ...overrides,
  };
}

function makeOfficialFight(
  overrides: Partial<BcOfficialFight> & { fightSeq: string | null },
): BcOfficialFight {
  return {
    fighterA: {
      sourceId: "fa-source",
      name: "Mammoth",
      ringName: null,
      nationality: null,
      record: null,
      division: null,
      weightClass: null,
    },
    fighterB: {
      sourceId: "fb-source",
      name: "Jackpot",
      ringName: null,
      nationality: null,
      record: null,
      division: null,
      weightClass: null,
    },
    boutLabel: null,
    isMainEvent: false,
    ...overrides,
  };
}

const HAPPY_RAW = {
  referee_name1: "VEGETABLE",
  score111: "9", score112: "9", score113: "9", score114: "0",
  total_score11: "27",
  score121: "10", score122: "10", score123: "10", score124: "0",
  total_score12: "30",
  overtimeYn11: "0", overtimeYn12: "0",
};

// ─────────────────────────────────────────────────────────────
// Cases
// ─────────────────────────────────────────────────────────────

describe("resolveScoreCardsByDbFightId — strict match + resolution kinds", () => {
  beforeEach(() => {
    _resetScoreCardCache();
    getMockClientGet().mockReset();
  });

  it("[method = null] suppressed-no-method, no fetch", async () => {
    const db = [makeDbFight({ id: "f1", method: null })];
    const official = [makeOfficialFight({ fightSeq: "308" })];
    const out = await resolveScoreCardsByDbFightId(db, official);
    expect(out.get("f1")).toEqual({ kind: "suppressed-no-method" });
    expect(getMockClientGet()).not.toHaveBeenCalled();
  });

  it("[method = KO/TKO] suppressed-non-decision, no fetch", async () => {
    const db = [makeDbFight({ id: "f1", method: "KO/TKO" })];
    const official = [makeOfficialFight({ fightSeq: "308" })];
    const out = await resolveScoreCardsByDbFightId(db, official);
    expect(out.get("f1")).toEqual({ kind: "suppressed-non-decision" });
    expect(getMockClientGet()).not.toHaveBeenCalled();
  });

  it("[method = Submission] suppressed-non-decision", async () => {
    const db = [makeDbFight({ id: "f1", method: "Submission" })];
    const out = await resolveScoreCardsByDbFightId(db, [
      makeOfficialFight({ fightSeq: "308" }),
    ]);
    expect(out.get("f1")).toEqual({ kind: "suppressed-non-decision" });
  });

  it("[no BC match] suppressed-no-match, no fetch (BC fighters differ from DB)", async () => {
    const db = [
      makeDbFight({
        id: "f1",
        fighter_a: { name: "Alpha Fighter", ring_name: null, name_en: null, name_ko: null },
        fighter_b: { name: "Bravo Fighter", ring_name: null, name_en: null, name_ko: null },
      }),
    ];
    const official = [
      makeOfficialFight({
        fightSeq: "308",
        fighterA: {
          sourceId: "x",
          name: "Charlie",
          ringName: null,
          nationality: null,
          record: null,
          division: null,
          weightClass: null,
        },
        fighterB: {
          sourceId: "y",
          name: "Delta",
          ringName: null,
          nationality: null,
          record: null,
          division: null,
          weightClass: null,
        },
      }),
    ];
    const out = await resolveScoreCardsByDbFightId(db, official);
    expect(out.get("f1")).toEqual({ kind: "suppressed-no-match" });
    expect(getMockClientGet()).not.toHaveBeenCalled();
  });

  it("[ambiguous match — same name both DB sides] suppressed-no-match", async () => {
    // Edge case: two fighters named the same on DB side. Strict
    // matcher must NOT pick one arbitrarily — suppress.
    const db = [
      makeDbFight({
        id: "f1",
        fighter_a: { name: "Kim", name_en: null, name_ko: null, ring_name: null },
        fighter_b: { name: "Kim", name_en: null, name_ko: null, ring_name: null },
      }),
    ];
    const official = [
      makeOfficialFight({
        fightSeq: "308",
        fighterA: {
          sourceId: "x", name: "Kim", ringName: null, nationality: null,
          record: null, division: null, weightClass: null,
        },
        fighterB: {
          sourceId: "y", name: "Park", ringName: null, nationality: null,
          record: null, division: null, weightClass: null,
        },
      }),
    ];
    const out = await resolveScoreCardsByDbFightId(db, official);
    expect(out.get("f1")).toEqual({ kind: "suppressed-no-match" });
  });

  it("[happy path — unique match] scored with parsed scoreCard", async () => {
    const mockGet = getMockClientGet();
    mockGet.mockResolvedValueOnce({ data: HAPPY_RAW });

    const db = [makeDbFight({ id: "f1" })];
    const official = [makeOfficialFight({ fightSeq: "308" })];
    const out = await resolveScoreCardsByDbFightId(db, official);

    const resolution = out.get("f1");
    expect(resolution?.kind).toBe("scored");
    if (resolution?.kind === "scored") {
      expect(resolution.scoreCard?.referees[0].name).toBe("VEGETABLE");
    }
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("[name-match via name_ko] Korean fighter name matches even when BC uses different casing", async () => {
    const mockGet = getMockClientGet();
    mockGet.mockResolvedValueOnce({ data: HAPPY_RAW });

    const db = [
      makeDbFight({
        id: "f1",
        fighter_a: { name: "김명환", name_en: "Kim Myeonghwan", name_ko: "김명환", ring_name: "Mammoth" },
        fighter_b: { name: "O'Shay Jordan", name_en: "O'Shay Jordan", name_ko: null, ring_name: "Jackpot" },
      }),
    ];
    const official = [
      makeOfficialFight({
        fightSeq: "308",
        fighterA: {
          sourceId: "x", name: "김명환", ringName: "Mammoth", nationality: null,
          record: null, division: null, weightClass: null,
        },
        fighterB: {
          sourceId: "y", name: "O'Shay Jordan", ringName: "Jackpot", nationality: null,
          record: null, division: null, weightClass: null,
        },
      }),
    ];
    const out = await resolveScoreCardsByDbFightId(db, official);
    expect(out.get("f1")?.kind).toBe("scored");
  });

  it("[positional-order regression] out-of-order DB vs official still pairs correctly by strict match", async () => {
    // Critical regression guard for Codex v3 blocker #2: positional
    // array couldn't be trusted. Strict matcher must find the right
    // official regardless of order.
    const mockGet = getMockClientGet();
    mockGet.mockResolvedValueOnce({ data: HAPPY_RAW });

    const db = [
      makeDbFight({
        id: "f2",
        fighter_a: { name: "Pork Chop", name_en: null, name_ko: null, ring_name: null },
        fighter_b: { name: "Lamb Hock", name_en: null, name_ko: null, ring_name: null },
      }),
    ];
    const official = [
      // Intentionally wrong order: this one doesn't match f2
      makeOfficialFight({
        fightSeq: "301",
        fighterA: {
          sourceId: "a", name: "Beef Rib", ringName: null, nationality: null,
          record: null, division: null, weightClass: null,
        },
        fighterB: {
          sourceId: "b", name: "Veal Shank", ringName: null, nationality: null,
          record: null, division: null, weightClass: null,
        },
      }),
      // The actual match, at position 1 not 0
      makeOfficialFight({
        fightSeq: "308",
        fighterA: {
          sourceId: "x", name: "Pork Chop", ringName: null, nationality: null,
          record: null, division: null, weightClass: null,
        },
        fighterB: {
          sourceId: "y", name: "Lamb Hock", ringName: null, nationality: null,
          record: null, division: null, weightClass: null,
        },
      }),
    ];
    const out = await resolveScoreCardsByDbFightId(db, official);
    expect(out.get("f2")?.kind).toBe("scored");
    // Verify the fetch hit the CORRECT seq — 308 not 301.
    expect(mockGet).toHaveBeenCalledWith(
      "/findScore.php?score_seq=308",
      expect.any(Object),
    );
  });

  it("[match but no fightSeq] suppressed-no-match (can't fetch)", async () => {
    const db = [makeDbFight({ id: "f1" })];
    const official = [makeOfficialFight({ fightSeq: null })];
    const out = await resolveScoreCardsByDbFightId(db, official);
    expect(out.get("f1")).toEqual({ kind: "suppressed-no-match" });
  });

  it("[mixed batch] non-decision + matched + no-match all processed in one call", async () => {
    const mockGet = getMockClientGet();
    mockGet.mockResolvedValueOnce({ data: HAPPY_RAW });

    const db = [
      makeDbFight({ id: "koFight", method: "KO/TKO" }),
      makeDbFight({ id: "decisionFight" }),
      makeDbFight({
        id: "orphan",
        fighter_a: { name: "Orphan", name_en: null, name_ko: null, ring_name: null },
        fighter_b: { name: "Unknown", name_en: null, name_ko: null, ring_name: null },
      }),
    ];
    const official = [makeOfficialFight({ fightSeq: "308" })];
    const out = await resolveScoreCardsByDbFightId(db, official);

    expect(out.get("koFight")?.kind).toBe("suppressed-non-decision");
    expect(out.get("decisionFight")?.kind).toBe("scored");
    expect(out.get("orphan")?.kind).toBe("suppressed-no-match");
    expect(mockGet).toHaveBeenCalledTimes(1); // only decisionFight triggered fetch
  });

  it("[BC returns {success:false} for a matched fight] scored with null scoreCard (admin hasn't finalized on BC yet)", async () => {
    const mockGet = getMockClientGet();
    mockGet.mockResolvedValueOnce({ data: { success: false, error: "not found" } });

    const db = [makeDbFight({ id: "f1" })];
    const official = [makeOfficialFight({ fightSeq: "999" })];
    const out = await resolveScoreCardsByDbFightId(db, official);

    expect(out.get("f1")).toEqual({ kind: "scored", scoreCard: null });
  });
});
