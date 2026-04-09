import { describe, expect, it } from "vitest";
import { validateAdminResultPayload } from "./admin-results";

describe("validateAdminResultPayload", () => {
  it("accepts a valid admin result payload", () => {
    const result = validateAdminResultPayload({
      fight_id: "fight-1",
      winner_id: "fighter-a",
      method: "KO/TKO",
      round: 3,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        fightId: "fight-1",
        winnerId: "fighter-a",
        method: "KO/TKO",
        round: 3,
      },
    });
  });

  it("rejects unsupported methods", () => {
    const result = validateAdminResultPayload({
      fight_id: "fight-1",
      winner_id: "fighter-a",
      method: "Doctor Stoppage" as "KO/TKO",
      round: 3,
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "fight_id, winner_id, and a valid method are required",
    });
  });

  it("rejects invalid round values", () => {
    const result = validateAdminResultPayload({
      fight_id: "fight-1",
      winner_id: "fighter-a",
      method: "Decision",
      round: 0,
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "round must be between 1 and 5",
    });
  });
});
