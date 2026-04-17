/**
 * Consumer-side orchestration for BC scorecard display.
 *
 * Why this file exists (spec v3 §L2 after Codex BLOCK):
 *
 * 1. `fetchBcOfficialEventCard` in `bc-official.ts` has no DB
 *    handle. Attempting to pre-filter on `fight.method === 'Decision'`
 *    there would be a design contradiction — we'd still pay the
 *    fetch for non-decision fights.
 * 2. `sync-bc-event-card.ts`'s `chooseFightRow` is a tolerant
 *    fallback matcher built for card alignment, where a best-guess
 *    match is better than nothing. Rendering scorecards has the
 *    opposite risk profile: an ambiguous match silently displays
 *    inverted scores under the wrong fighter name. We need a STRICT
 *    two-sided matcher that rejects ambiguity outright.
 *
 * This module is called from server components (page.tsx,
 * events/[id], fights/[fightId]) AFTER they have both the DB
 * fights + the `fetchBcOfficialEventCard` result in scope. It
 * returns a `Map<dbFightId, ScoreCardResolution>` so rendering
 * is keyed by DB fight id — never by positional array index —
 * closing the scorecard-shifts-onto-wrong-fight silent failure
 * mode (spec v3 blocker B2).
 */

import {
  fetchBcScoreCard,
  type BcOfficialFight,
  type BcScoreCard,
} from "./bc-official";

/** Minimal DB fight shape this helper reads. Matches what the
 * server pages already select. Unused fields omitted so the
 * helper doesn't accidentally couple to other columns. */
export type DbFightForScoreCard = {
  id: string;
  method: string | null;
  fighter_a: DbFighterForScoreCard;
  fighter_b: DbFighterForScoreCard;
};

export type DbFighterForScoreCard = {
  name?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
  ring_name?: string | null;
};

/**
 * Resolution per DB fight. `scored` fights get a `scoreCard`
 * (which may itself be `null` if BC returned no card — e.g., the
 * match was a decision on our side but BC hasn't published the
 * scorecard yet). The `suppressed-*` variants carry the reason
 * for observability + testability without leaking a scorecard
 * element into the UI.
 */
export type ScoreCardResolution =
  | { kind: "scored"; scoreCard: BcScoreCard | null }
  | { kind: "suppressed-no-method" }
  | { kind: "suppressed-non-decision" }
  | { kind: "suppressed-no-match" };

/** Strict name normalization — NFKC + lowercase + strip all
 * non-alphanumeric. Matches the sync-bc-event-card.ts baseline
 * so fighter manifests stay in sync, but this file enforces
 * stricter UNIQUENESS requirements on top (see `pickUniqueMatch`). */
function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function fighterCandidateKeys(fighter: DbFighterForScoreCard): string[] {
  return [fighter.name, fighter.name_en, fighter.name_ko, fighter.ring_name]
    .map(normalizeName)
    .filter((key) => key.length > 0);
}

function officialCandidateKeys(fighter: BcOfficialFight["fighterA"]): string[] {
  // BC populates `.name` from the `font-size:1.5rem` headline div
  // and `.ringName` from the separate "RING NAME" row. Both are
  // viable match keys — if BC ever flips the layout (or an event's
  // card hides the legal name behind the ring name), falling back
  // onto `.ringName` keeps the match working rather than silently
  // dropping to `suppressed-no-match`.
  return [fighter.name, fighter.ringName]
    .map((v) => normalizeName(v))
    .filter((key) => key.length > 0);
}

/**
 * Tries each BC-side candidate (`.name` then `.ringName`) against
 * the DB fighter keys. Returns `'A'` / `'B'` / `null`.
 *
 * Strict rule preserved even with multiple candidates:
 *   - Any candidate matching BOTH DB sides is ambiguous → null
 *   - At least one candidate must uniquely match ONE side
 */
function matchSide(
  candidates: readonly string[],
  dbFight: DbFightForScoreCard,
): "A" | "B" | null {
  if (candidates.length === 0) return null;
  const aKeys = fighterCandidateKeys(dbFight.fighter_a);
  const bKeys = fighterCandidateKeys(dbFight.fighter_b);
  for (const candidate of candidates) {
    const hitA = aKeys.includes(candidate);
    const hitB = bKeys.includes(candidate);
    if (hitA && hitB) return null; // ambiguous — same normalized name on both DB sides
    if (hitA) return "A";
    if (hitB) return "B";
  }
  return null;
}

/**
 * Given a DB fight and an official BC fight, decide whether the
 * two describe the same bout with both sides uniquely identifiable.
 * Returns true only when:
 *   - BC fighter A uniquely resolves to ONE DB side (by name or ring name)
 *   - BC fighter B uniquely resolves to the OTHER DB side
 *   - (They resolve to different sides — not both to "A".)
 */
function isStrictPairMatch(
  dbFight: DbFightForScoreCard,
  official: BcOfficialFight,
): boolean {
  const sideForA = matchSide(officialCandidateKeys(official.fighterA), dbFight);
  const sideForB = matchSide(officialCandidateKeys(official.fighterB), dbFight);
  if (!sideForA || !sideForB) return false;
  return sideForA !== sideForB;
}

/**
 * Orchestrates the scorecard pipeline for all fights on one event:
 *   1. Decide suppression reason per DB fight (no-method /
 *      non-decision / no-match) based on DB state + strict match.
 *   2. For fights that survive suppression, collect their
 *      corresponding `fightSeq` values and fetch scorecards in
 *      parallel via `Promise.allSettled`.
 *   3. Return a `Map<dbFight.id, ScoreCardResolution>`.
 *
 * Failed fetches (thrown errors) resolve to `scored` with
 * `scoreCard: null` — the caller should render nothing for that
 * fight but NOT suppress it as a match failure (which would be
 * misleading observability).
 */
export async function resolveScoreCardsByDbFightId(
  dbFights: readonly DbFightForScoreCard[],
  officialFights: readonly BcOfficialFight[],
): Promise<Map<string, ScoreCardResolution>> {
  const result = new Map<string, ScoreCardResolution>();
  const pendingFetches: Array<{ dbId: string; seq: string }> = [];

  // Caller contract: `dbFights[*].id` is unique (Postgres PK). If a
  // caller passes duplicates, the later entry silently overwrites the
  // earlier one in the result Map — documented rather than asserted
  // because the PK constraint makes this unreachable in practice.
  //
  // Two DB fights legitimately matching the SAME BC official fight
  // (e.g., accidental duplicate data-sync rows) would both queue a
  // fetch for the same `fightSeq`. The L1 cache deduplicates the HTTP,
  // but both DB fights would display the same scorecard — also a data-
  // integrity issue, not a logic bug.
  for (const dbFight of dbFights) {
    if (dbFight.method === null || dbFight.method === undefined) {
      result.set(dbFight.id, { kind: "suppressed-no-method" });
      continue;
    }
    if (dbFight.method !== "Decision") {
      result.set(dbFight.id, { kind: "suppressed-non-decision" });
      continue;
    }

    const matched = officialFights.find((official) =>
      isStrictPairMatch(dbFight, official),
    );
    if (!matched || !matched.fightSeq) {
      result.set(dbFight.id, { kind: "suppressed-no-match" });
      continue;
    }

    pendingFetches.push({ dbId: dbFight.id, seq: matched.fightSeq });
  }

  if (pendingFetches.length === 0) return result;

  const settled = await Promise.allSettled(
    pendingFetches.map(({ seq }) => fetchBcScoreCard(seq)),
  );

  settled.forEach((outcome, index) => {
    const { dbId } = pendingFetches[index];
    if (outcome.status === "fulfilled") {
      result.set(dbId, { kind: "scored", scoreCard: outcome.value });
    } else {
      // Theoretically unreachable: `fetchBcScoreCard` has an
      // unconditional try/catch that swallows to null. Kept as a
      // belt-and-braces safety net so a future refactor that
      // removes the catch doesn't crash the whole resolver.
      result.set(dbId, { kind: "scored", scoreCard: null });
    }
  });

  return result;
}
