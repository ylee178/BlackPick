/**
 * Pulls top-15 + champion rankings from
 * `blackcombat-official.com/ranking.php` and persists them to
 * `fighters.is_champion` / `fighters.rank_position`.
 *
 * Safety contract:
 *
 *   - Dry-run by default. `--apply` to write.
 *   - Fighter identity is resolved via `fighters.source_fighter_id`
 *     first (strict match on BC seq). If that misses, the script
 *     falls back to a normalized-name match within the same weight
 *     class, and backfills `source_fighter_id` when it finds a
 *     single unambiguous candidate. Multi-match candidates are
 *     logged and skipped — the sync script never guesses.
 *   - Wipe guard: if the parser returns 0 entries OR 0 divisions
 *     seen, treat it as a transient BC failure and ABORT without
 *     touching any DB row. Sean's requirement per 2026-04-19 Codex
 *     review: a transient outage must not nuke all ranks.
 *   - Stale-reset: for every division we DID see, any fighter row
 *     currently ranked within that weight class whose source_fighter_id
 *     is NOT in the fresh ranking result is reset to
 *     `is_champion=false, rank_position=null`. "Retired" vs "demoted
 *     out of top-15" is not distinguishable from BC's page; both
 *     collapse to unranked which is the correct display.
 *   - Only touches `is_champion`, `rank_position`, and
 *     `source_fighter_id`. All other fighter columns are left alone.
 *
 * Usage:
 *
 *   npx tsx src/scripts/sync-bc-fighter-ranks.ts          # dry-run
 *   npx tsx src/scripts/sync-bc-fighter-ranks.ts --apply  # write
 *
 * Run-order: run `sync-bc-event-card.ts` first when a fighter has
 * moved divisions. This script's tier-1 matcher finds the row by BC
 * seq without re-checking `weight_class`, so a division move is
 * written correctly — but the chip label still renders with the
 * stale `fighters.weight_class` value until the event-card sync
 * refreshes it. Not a correctness issue; a visual staleness one. The
 * upcoming `feature/crawler-automation-cadence` cron runner is the
 * right place to enforce this ordering.
 *
 * Read-path contract (for downstream consumers):
 *   These columns are the FALLBACK source on event/fight surfaces —
 *   live `bcFighterADivision` from `src/lib/bc-predictions.ts` remains
 *   primary until rank sync is wired into cron (next branch:
 *   `feature/crawler-automation-cadence`). The `/fighters/{id}` detail
 *   page is the only surface that reads these columns as primary.
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  fetchBcFighterProfile,
  fetchBcRankings,
  type BcRankingEntry,
} from "../lib/bc-rankings";

loadEnv({ path: ".env" });

type FighterRow = {
  id: string;
  name: string | null;
  name_en: string | null;
  name_ko: string | null;
  ring_name: string | null;
  weight_class: string | null;
  source_fighter_id: string | null;
  is_champion: boolean;
  rank_position: number | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

async function loadAllFighters(): Promise<FighterRow[]> {
  const { data, error } = await supabase
    .from("fighters")
    .select(
      "id, name, name_en, name_ko, ring_name, weight_class, source_fighter_id, is_champion, rank_position",
    )
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as FighterRow[];
}

type MatchResult =
  | { kind: "by-source-id"; fighter: FighterRow }
  | { kind: "by-name"; fighter: FighterRow; backfillSourceId: string }
  | { kind: "by-profile"; fighter: FighterRow; backfillSourceId: string }
  | { kind: "ambiguous"; candidates: FighterRow[] }
  | { kind: "unmatched" };

/**
 * Tier-1 (source_fighter_id) + tier-2 (name + weight class) match.
 * Synchronous — no network. Tier-3 (BC profile fetch) runs as a
 * separate pass for entries this returns `unmatched` on.
 */
function matchFighterLocal(entry: BcRankingEntry, fighters: FighterRow[]): MatchResult {
  // Tier 1: strict source_fighter_id match (post-backfill happy path).
  const bySourceId = fighters.filter(
    (f) => f.source_fighter_id === entry.sourceFighterId,
  );
  if (bySourceId.length === 1) return { kind: "by-source-id", fighter: bySourceId[0] };
  if (bySourceId.length > 1) return { kind: "ambiguous", candidates: bySourceId };

  // Tier 2: normalized-name match scoped to the same weight class.
  // Restricting to the announced weight class prevents a fighter who
  // moved divisions from getting tagged with a stale rank from their
  // old class.
  const target = normalizeName(entry.displayName);
  if (!target) return { kind: "unmatched" };
  const byName = fighters.filter((f) => {
    if (f.weight_class && entry.weightClass && f.weight_class !== entry.weightClass) {
      return false;
    }
    return [f.name, f.name_en, f.name_ko, f.ring_name]
      .map(normalizeName)
      .some((candidate) => candidate && candidate === target);
  });
  if (byName.length === 1) {
    return {
      kind: "by-name",
      fighter: byName[0],
      backfillSourceId: entry.sourceFighterId,
    };
  }
  if (byName.length > 1) return { kind: "ambiguous", candidates: byName };
  return { kind: "unmatched" };
}

/**
 * Tier-3: resolve by BC fighter-profile name after tier-1 + tier-2
 * have both missed. No weight-class scope, because the ranking entry's
 * weight class may differ from our stored `fighters.weight_class` for
 * fighters that existed pre-rank-sync. Still strict: requires exactly
 * one DB candidate matching on name / name_en / name_ko / ring_name.
 * Never overwrites `weight_class` — that's outside this job's write
 * authority per Codex 2026-04-19.
 */
function matchFighterByProfile(
  profile: { displayName: string | null; ringName: string | null },
  sourceFighterId: string,
  fighters: FighterRow[],
): MatchResult {
  const targets = [
    normalizeName(profile.displayName),
    normalizeName(profile.ringName),
  ].filter((t): t is string => Boolean(t));
  if (targets.length === 0) return { kind: "unmatched" };

  const candidates = fighters.filter((f) => {
    const keys = [f.name, f.name_en, f.name_ko, f.ring_name]
      .map(normalizeName)
      .filter(Boolean);
    return keys.some((key) => targets.includes(key));
  });
  if (candidates.length === 1) {
    return {
      kind: "by-profile",
      fighter: candidates[0],
      backfillSourceId: sourceFighterId,
    };
  }
  if (candidates.length > 1) return { kind: "ambiguous", candidates };
  return { kind: "unmatched" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TIER3_RATE_LIMIT_MS = 1200;

// Snapshot fields that drive the pre/post log labels. Cloning them at
// action-record time (not holding a live reference) keeps the log
// honest when later iterations mutate the in-memory fighter row.
type FighterSnapshot = Pick<FighterRow, "name" | "is_champion" | "rank_position" | "weight_class">;

type ApplyAction =
  | { kind: "update"; fighterId: string; patch: Partial<FighterRow>; prev: FighterSnapshot; entry: BcRankingEntry }
  | { kind: "reset"; fighterId: string; prev: FighterSnapshot }
  | { kind: "same"; fighterId: string }
  | { kind: "skip-ambiguous"; entry: BcRankingEntry; candidateIds: string[] }
  | { kind: "skip-unmatched"; entry: BcRankingEntry };

function snapshotFighter(fighter: FighterRow): FighterSnapshot {
  return {
    name: fighter.name,
    is_champion: fighter.is_champion,
    rank_position: fighter.rank_position,
    weight_class: fighter.weight_class,
  };
}

async function main() {
  const shouldApply = process.argv.includes("--apply");

  console.log("🔍 Fetching BC rankings...");
  const result = await fetchBcRankings();

  // Wipe guard: a parse that returns zero entries AND zero divisions
  // is almost certainly a BC outage or markup change, not a world
  // where every division is vacant. Bail before touching any row.
  if (result.entries.length === 0 || result.divisionsSeen.length === 0) {
    console.error(
      `❌ Parser returned ${result.entries.length} entries across ${result.divisionsSeen.length} divisions — refusing to wipe existing ranks. Inspect /ranking.php and re-run.`,
    );
    process.exit(3);
  }

  console.log(
    `   Parsed ${result.entries.length} ranked slots across ${result.divisionsSeen.length} divisions`,
  );

  const fighters = await loadAllFighters();
  const actions: ApplyAction[] = [];

  // Per-fighter chosen-entry map. BC lists some fighters across
  // multiple divisions (e.g. 오일학 = 웰터급 #2 AND 미들급 CHAMPION).
  // Collapsing by DB fighter.id with explicit priority rules gives
  // one authoritative entry per fighter before computing patches,
  // preventing flip-flop writes + CHECK constraint violations.
  type ChosenMatch = {
    fighter: FighterRow;
    entry: BcRankingEntry;
    backfillSourceId: string | null;
  };
  const chosenByFighter = new Map<string, ChosenMatch>();

  // Entries that need the tier-3 BC profile fetch fallback.
  const tier3Queue: BcRankingEntry[] = [];

  /**
   * Decides if `candidate` beats `incumbent` as the representative
   * ranking entry for a fighter. Deterministic priority:
   *   1. Champion beats ranked.
   *   2. When both are the same kind, the entry whose weight_class
   *      matches the fighter's stored DB weight_class wins.
   *   3. When both still tied, lower position number wins (#1 beats
   *      #6 — higher rank = smaller number).
   */
  const candidateWins = (
    candidate: BcRankingEntry,
    incumbent: BcRankingEntry,
    fighter: FighterRow,
  ): boolean => {
    if (candidate.kind === "champion" && incumbent.kind !== "champion") return true;
    if (incumbent.kind === "champion" && candidate.kind !== "champion") return false;
    const candMatchesWeight =
      !!fighter.weight_class && candidate.weightClass === fighter.weight_class;
    const incMatchesWeight =
      !!fighter.weight_class && incumbent.weightClass === fighter.weight_class;
    if (candMatchesWeight && !incMatchesWeight) return true;
    if (incMatchesWeight && !candMatchesWeight) return false;
    if (candidate.kind === "ranked" && incumbent.kind === "ranked") {
      return (candidate.position ?? 16) < (incumbent.position ?? 16);
    }
    return false;
  };

  const considerMatch = (
    match: Extract<MatchResult, { kind: "by-source-id" | "by-name" | "by-profile" }>,
    entry: BcRankingEntry,
  ) => {
    const fighter = match.fighter;
    const backfillSourceId =
      match.kind === "by-source-id" ? null : match.backfillSourceId;
    const existing = chosenByFighter.get(fighter.id);
    if (!existing) {
      chosenByFighter.set(fighter.id, { fighter, entry, backfillSourceId });
      return;
    }
    if (candidateWins(entry, existing.entry, fighter)) {
      chosenByFighter.set(fighter.id, {
        fighter,
        entry,
        backfillSourceId: backfillSourceId ?? existing.backfillSourceId,
      });
    } else if (backfillSourceId && !existing.backfillSourceId) {
      // Keep the existing entry but remember the backfill source_id
      // (tier-2/3 fills in the stable BC key even when the entry
      // itself loses the priority contest).
      chosenByFighter.set(fighter.id, { ...existing, backfillSourceId });
    }
  };

  // Pass 1: tier-1 + tier-2 sync matches. Unmatched entries queue for
  // pass 2, the rate-limited BC profile fallback.
  for (const entry of result.entries) {
    const match = matchFighterLocal(entry, fighters);
    if (match.kind === "ambiguous") {
      actions.push({
        kind: "skip-ambiguous",
        entry,
        candidateIds: match.candidates.map((c) => c.id),
      });
      continue;
    }
    if (match.kind === "unmatched") {
      tier3Queue.push(entry);
      continue;
    }
    considerMatch(match, entry);
  }

  // Pass 2: tier-3. For each queued entry, fetch the BC fighter
  // profile and look up our DB fighter by name. Rate-limited per
  // Codex 2026-04-19 — tier-3 only runs for the gap the local match
  // couldn't close, so the BC request budget is proportional to
  // coverage debt.
  if (tier3Queue.length > 0) {
    console.log(`   Tier-3 fallback: fetching ${tier3Queue.length} BC fighter profile(s)…`);
  }
  for (const entry of tier3Queue) {
    await sleep(TIER3_RATE_LIMIT_MS);
    let profile: { displayName: string | null; ringName: string | null };
    try {
      profile = await fetchBcFighterProfile(entry.sourceFighterId);
    } catch (err) {
      console.log(
        `  [tier-3-fail] ${entry.displayName} (${entry.weightClass}) source_id=${entry.sourceFighterId} — BC fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      actions.push({ kind: "skip-unmatched", entry });
      continue;
    }
    const match = matchFighterByProfile(profile, entry.sourceFighterId, fighters);
    if (match.kind === "ambiguous") {
      actions.push({
        kind: "skip-ambiguous",
        entry,
        candidateIds: match.candidates.map((c) => c.id),
      });
      continue;
    }
    if (match.kind === "unmatched") {
      actions.push({ kind: "skip-unmatched", entry });
      continue;
    }
    considerMatch(match, entry);
  }

  // Pass 3: compute patches from the collapsed choices — one action
  // per fighter, no flip-flop.
  const matchedIds = new Set<string>();
  for (const { fighter, entry, backfillSourceId } of chosenByFighter.values()) {
    matchedIds.add(fighter.id);
    const newIsChampion = entry.kind === "champion";
    const newRankPosition = entry.kind === "ranked" ? entry.position : null;
    const patch: Partial<FighterRow> = {};
    if (
      fighter.is_champion !== newIsChampion ||
      fighter.rank_position !== newRankPosition
    ) {
      patch.is_champion = newIsChampion;
      patch.rank_position = newRankPosition;
    }
    if (backfillSourceId && fighter.source_fighter_id !== backfillSourceId) {
      patch.source_fighter_id = backfillSourceId;
    }
    if (Object.keys(patch).length === 0) {
      actions.push({ kind: "same", fighterId: fighter.id });
    } else {
      actions.push({
        kind: "update",
        fighterId: fighter.id,
        patch,
        prev: snapshotFighter(fighter),
        entry,
      });
    }
  }

  // Stale-reset: fighters whose weight_class matches one of the divisions
  // we saw, and who currently have any ranking set, but who aren't in
  // matchedIds. Demoted-out-of-top-15 or retired — both collapse to
  // unranked, which is the correct display.
  const divisionsSet = new Set(result.divisionsSeen);
  for (const fighter of fighters) {
    if (matchedIds.has(fighter.id)) continue;
    if (!fighter.weight_class || !divisionsSet.has(fighter.weight_class)) continue;
    if (!fighter.is_champion && fighter.rank_position === null) continue;
    actions.push({ kind: "reset", fighterId: fighter.id, prev: snapshotFighter(fighter) });
  }

  // Print + apply in order. Writes are per-row so a single failure
  // doesn't roll back the whole batch — the sync is idempotent, the
  // next run will replay anything that failed.
  let updates = 0;
  let resets = 0;
  let sameCount = 0;
  let skipped = 0;

  for (const action of actions) {
    switch (action.kind) {
      case "update": {
        const { prev, patch, entry } = action;
        const label =
          entry.kind === "champion"
            ? "CHAMPION"
            : `#${entry.position}`;
        const prevLabel = prev.is_champion
          ? "CHAMPION"
          : prev.rank_position !== null
            ? `#${prev.rank_position}`
            : "unranked";
        console.log(
          `  [update] ${prev.name} (${entry.weightClass}) ${prevLabel} → ${label}`,
        );
        if (shouldApply) {
          const { error } = await supabase
            .from("fighters")
            .update(patch)
            .eq("id", action.fighterId);
          if (error) console.error(`    ! update failed: ${error.message}`);
        }
        updates++;
        break;
      }
      case "reset": {
        const { prev } = action;
        const prevLabel = prev.is_champion
          ? "CHAMPION"
          : prev.rank_position !== null
            ? `#${prev.rank_position}`
            : "unranked";
        console.log(
          `  [reset] ${prev.name} (${prev.weight_class}) ${prevLabel} → unranked (fell out of top-15)`,
        );
        if (shouldApply) {
          const { error } = await supabase
            .from("fighters")
            .update({ is_champion: false, rank_position: null })
            .eq("id", action.fighterId);
          if (error) console.error(`    ! reset failed: ${error.message}`);
        }
        resets++;
        break;
      }
      case "same":
        sameCount++;
        break;
      case "skip-ambiguous":
        console.log(
          `  [ambiguous] ${action.entry.displayName} (${action.entry.weightClass}) — ${action.candidateIds.length} DB candidates; manual resolution needed`,
        );
        skipped++;
        break;
      case "skip-unmatched":
        console.log(
          `  [unmatched] ${action.entry.displayName} (${action.entry.weightClass}) source_id=${action.entry.sourceFighterId} — no DB fighter matches`,
        );
        skipped++;
        break;
    }
  }

  console.log("");
  console.log(
    `Summary: ${updates} updated · ${resets} reset · ${sameCount} already correct · ${skipped} skipped`,
  );
  if (!shouldApply && (updates > 0 || resets > 0)) {
    console.log("Dry run — re-run with --apply to write.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
