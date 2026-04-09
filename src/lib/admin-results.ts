import type { Database } from "@/types/database";

export type FightMethod = NonNullable<Database["public"]["Tables"]["fights"]["Row"]["method"]>;

export const VALID_FIGHT_METHODS = new Set<FightMethod>(["KO/TKO", "Submission", "Decision"]);

export function validateAdminResultPayload(body: {
  fight_id?: string;
  winner_id?: string;
  method?: FightMethod;
  round?: number;
}) {
  const fightId = body.fight_id?.trim();
  const winnerId = body.winner_id?.trim();
  const method = body.method;
  const round = Number(body.round);

  if (!fightId || !winnerId || !method || !VALID_FIGHT_METHODS.has(method)) {
    return {
      ok: false as const,
      status: 400,
      error: "fight_id, winner_id, and a valid method are required",
    };
  }

  if (!Number.isInteger(round) || round < 1 || round > 5) {
    return {
      ok: false as const,
      status: 400,
      error: "round must be between 1 and 5",
    };
  }

  return {
    ok: true as const,
    value: {
      fightId,
      winnerId,
      method,
      round,
    },
  };
}
