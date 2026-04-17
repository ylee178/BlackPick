import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// axios must be mocked BEFORE importing bc-official so the module's
// `client = axios.create(...)` call picks up the mocked factory.
vi.mock("axios", () => {
  const get = vi.fn();
  const create = vi.fn(() => ({ get }));
  return {
    default: { create, get },
    create,
  };
});

// eslint-disable-next-line import/first, import/order
import axios from "axios";
// eslint-disable-next-line import/first, import/order
import {
  _resetScoreCardCache,
  fetchBcScoreCard,
  parseScoreCardJson,
  type BcScoreCard,
} from "./bc-official";

// Helper: pull the mocked `get` fn off the axios.create() result.
// `axios.create` is the spy; calling it returns an object with `get`.
function getMockClientGet(): ReturnType<typeof vi.fn> {
  const mockedAxios = axios as unknown as { create: ReturnType<typeof vi.fn> };
  // `create` was called at module load with the real config. Return its last result's `get`.
  const calls = mockedAxios.create.mock.results;
  if (calls.length === 0) throw new Error("axios.create not called");
  return calls[0].value.get;
}

describe("parseScoreCardJson — 6-case matrix", () => {
  it("[case 1] 3-referee full decision — all fields populated", () => {
    const raw = {
      referee_name1: "VEGETABLE",
      score111: "9",  minus_score111: "0",
      score112: "9",  minus_score112: "0",
      score113: "9",  minus_score113: "0",
      score114: "0",  minus_score114: "0",
      total_score11: "27", overtimeYn11: "0",
      score121: "10", minus_score121: "0",
      score122: "10", minus_score122: "0",
      score123: "10", minus_score123: "0",
      score124: "0",  minus_score124: "0",
      total_score12: "30",
      referee_name2: "MASTER KIM",
      score211: "9",  minus_score211: "0",
      score212: "8",  minus_score212: "0",
      score213: "9",  minus_score213: "0",
      score214: "0",  minus_score214: "0",
      total_score21: "26", overtimeYn21: "0",
      score221: "10", minus_score221: "0",
      score222: "10", minus_score222: "0",
      score223: "10", minus_score223: "0",
      score224: "0",  minus_score224: "0",
      total_score22: "30",
      referee_name3: "LOGAN",
      score311: "9",  minus_score311: "0",
      score312: "9",  minus_score312: "0",
      score313: "9",  minus_score313: "0",
      score314: "0",  minus_score314: "0",
      total_score31: "27", overtimeYn31: "0",
      score321: "10", minus_score321: "0",
      score322: "10", minus_score322: "0",
      score323: "10", minus_score323: "0",
      score324: "0",  minus_score324: "0",
      total_score32: "30",
    };
    const parsed = parseScoreCardJson(raw);
    expect(parsed).not.toBeNull();
    const card = parsed as BcScoreCard;
    expect(card.referees).toHaveLength(3);
    expect(card.referees[0].name).toBe("VEGETABLE");
    expect(card.referees[0].fighterA.roundScores).toEqual([9, 9, 9, 0]);
    expect(card.referees[0].fighterA.total).toBe(27);
    expect(card.referees[0].fighterB.roundScores).toEqual([10, 10, 10, 0]);
    expect(card.referees[0].fighterB.total).toBe(30);
    expect(card.referees[1].name).toBe("MASTER KIM");
    expect(card.referees[2].name).toBe("LOGAN");
  });

  it("[case 2] 2-referee legacy — third slot absent, first two emitted", () => {
    const raw = {
      referee_name1: "ALPHA",
      score111: "10", score112: "10", score113: "10", score114: "0",
      total_score11: "30",
      score121: "9", score122: "9", score123: "9", score124: "0",
      total_score12: "27",
      overtimeYn11: "0", overtimeYn12: "0",
      referee_name2: "BETA",
      score211: "10", score212: "10", score213: "10", score214: "0",
      total_score21: "30",
      score221: "9", score222: "9", score223: "9", score224: "0",
      total_score22: "27",
      overtimeYn21: "0", overtimeYn22: "0",
      // referee_name3 intentionally omitted
    };
    const parsed = parseScoreCardJson(raw);
    expect(parsed).not.toBeNull();
    expect((parsed as BcScoreCard).referees).toHaveLength(2);
    expect((parsed as BcScoreCard).referees[0].name).toBe("ALPHA");
    expect((parsed as BcScoreCard).referees[1].name).toBe("BETA");
  });

  it("[case 3] BC error envelope `{success:false}` → null", () => {
    expect(parseScoreCardJson({ success: false, error: "not found" })).toBeNull();
  });

  it("[case 4] malformed input → null (array / primitive / null)", () => {
    expect(parseScoreCardJson(null)).toBeNull();
    expect(parseScoreCardJson(undefined)).toBeNull();
    expect(parseScoreCardJson("not json")).toBeNull();
    expect(parseScoreCardJson(42)).toBeNull();
    // Arrays are objects in JS but yield no referee fields.
    expect(parseScoreCardJson([])).toBeNull();
  });

  it("[case 5] overtime flag propagates when any referee reports OT", () => {
    const raw = {
      referee_name1: "OT REF",
      score111: "10", score112: "10", score113: "10", score114: "10",
      total_score11: "40",
      score121: "9", score122: "9", score123: "9", score124: "9",
      total_score12: "36",
      overtimeYn11: "1", overtimeYn12: "1", // A and B both have OT scored for ref 1
    };
    const parsed = parseScoreCardJson(raw);
    expect(parsed).not.toBeNull();
    const card = parsed as BcScoreCard;
    expect(card.referees[0].fighterA.overtime).toBe(true);
    expect(card.referees[0].fighterB.overtime).toBe(true);
    expect(card.referees[0].fighterA.roundScores[3]).toBe(10); // R4 populated
  });

  it("[case 6] all-zero referee row — preserved, not suppressed", () => {
    // Referee has a name but no filled scores. Parser keeps the row;
    // UI layer decides whether to show (per spec, it does — component
    // is dumb about numeric validity).
    const raw = {
      referee_name1: "NEWBIE",
      score111: "0", score112: "0", score113: "0", score114: "0",
      total_score11: "0",
      score121: "0", score122: "0", score123: "0", score124: "0",
      total_score12: "0",
      overtimeYn11: "0", overtimeYn12: "0",
    };
    const parsed = parseScoreCardJson(raw);
    expect(parsed).not.toBeNull();
    const card = parsed as BcScoreCard;
    expect(card.referees).toHaveLength(1);
    expect(card.referees[0].fighterA.roundScores).toEqual([0, 0, 0, 0]);
    expect(card.referees[0].fighterB.total).toBe(0);
  });
});

describe("fetchBcScoreCard — fetch + cache", () => {
  beforeEach(() => {
    _resetScoreCardCache();
    getMockClientGet().mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const happyRaw = {
    referee_name1: "VEGETABLE",
    score111: "9", score112: "9", score113: "9", score114: "0",
    total_score11: "27",
    score121: "10", score122: "10", score123: "10", score124: "0",
    total_score12: "30",
    overtimeYn11: "0", overtimeYn12: "0",
  };

  it("success path: resolves parsed card + caches for 10 min", async () => {
    const mockGet = getMockClientGet();
    mockGet.mockResolvedValueOnce({ data: happyRaw });

    const first = await fetchBcScoreCard("308");
    expect(first?.referees[0].name).toBe("VEGETABLE");
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(
      "/findScore.php?score_seq=308",
      expect.objectContaining({
        timeout: 3_000,
        headers: expect.objectContaining({
          "X-Requested-With": "XMLHttpRequest",
        }),
      }),
    );

    // Second call within TTL — served from cache, no extra HTTP.
    const second = await fetchBcScoreCard("308");
    expect(second).toEqual(first);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("BC error envelope: null cached for 10 min (treated as success — legitimate no-card)", async () => {
    const mockGet = getMockClientGet();
    mockGet.mockResolvedValueOnce({ data: { success: false, error: "not found" } });

    const first = await fetchBcScoreCard("99999");
    expect(first).toBeNull();
    const second = await fetchBcScoreCard("99999");
    expect(second).toBeNull();
    expect(mockGet).toHaveBeenCalledTimes(1); // cached
  });

  it("thrown error path: null returned + cached for only 60s (retry quickly)", async () => {
    const mockGet = getMockClientGet();
    mockGet.mockRejectedValueOnce(new Error("ECONNRESET"));
    // After a short cache window, the next call should still be served
    // from cache to avoid hammering BC. We can't easily travel 61s
    // forward in tests without `vi.useFakeTimers()`, so assert the
    // within-TTL behavior: one call caches, second doesn't re-hit.
    const first = await fetchBcScoreCard("500");
    expect(first).toBeNull();
    const second = await fetchBcScoreCard("500");
    expect(second).toBeNull();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("in-flight stampede: two parallel callers share ONE BC request (Codex regression fix)", async () => {
    const mockGet = getMockClientGet();
    // Slow response — both callers initiate before either completes.
    let resolveFn!: (v: unknown) => void;
    mockGet.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );

    const first = fetchBcScoreCard("stampede-1");
    const second = fetchBcScoreCard("stampede-1");

    // Both callers have kicked off before the HTTP resolves. The
    // inflight-dedup contract says they share one request.
    expect(mockGet).toHaveBeenCalledTimes(1);

    resolveFn({ data: happyRaw });
    const [a, b] = await Promise.all([first, second]);
    expect(a?.referees[0].name).toBe("VEGETABLE");
    expect(b).toEqual(a);
    // And still only one HTTP call after both settled.
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("error cache expires faster than success cache (separate TTLs)", async () => {
    vi.useFakeTimers();
    try {
      const mockGet = getMockClientGet();
      mockGet.mockRejectedValueOnce(new Error("timeout"));
      mockGet.mockResolvedValueOnce({ data: happyRaw });

      await fetchBcScoreCard("retry-seq");
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Advance past the 60s error TTL but stay under the 10min success TTL.
      vi.advanceTimersByTime(61_000);

      const second = await fetchBcScoreCard("retry-seq");
      expect(second?.referees[0].name).toBe("VEGETABLE");
      expect(mockGet).toHaveBeenCalledTimes(2); // retried after 60s
    } finally {
      vi.useRealTimers();
    }
  });
});
