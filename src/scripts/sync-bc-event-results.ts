/**
 * Stages fight winners from the BC official site into our DB so the
 * admin `/admin/results` UI can pre-select the correct winner (admin
 * still has to enter method + round — those are behind a JS-only
 * scorecard modal on BC, not in the static HTML we scrape).
 *
 * Safety contract:
 *
 *   - Dry-run by default. Pass `--apply` to write.
 *   - Only updates rows where `fights.result_processed_at IS NULL`.
 *     Once admin finalises a result via the
 *     `admin_process_fight_result` RPC, the row is FROZEN — we never
 *     overwrite scored fights. This preserves the atomic-lock +
 *     scoring contract from the 2026-04-17 Codex migration.
 *   - Only touches `fights.winner_id`. Method, round, status, and
 *     result_processed_at are ALL left alone — those are the admin's
 *     job, and leaving them null means the fight still shows up in
 *     the admin's `/admin/results` queue (the page filters on
 *     `result_processed_at IS NULL`).
 *   - Scope defaults to events that have at least one BC-published
 *     winner AND `status != 'cancelled'`. Pass `--event-id=<uuid>`
 *     to target a specific event (same flag shape as
 *     `sync-bc-event-card.ts`).
 *
 * Usage:
 *
 *   npx tsx src/scripts/sync-bc-event-results.ts                  # dry-run, all events with source_event_id
 *   npx tsx src/scripts/sync-bc-event-results.ts --apply          # apply
 *   npx tsx src/scripts/sync-bc-event-results.ts --event-id=abc   # dry-run a single event
 *   npx tsx src/scripts/sync-bc-event-results.ts --event-id=abc --apply
 *
 * Why this isn't a GitHub Action yet: the BC site is the canonical
 * source but doesn't publish result timing metadata, so we can't
 * reliably know when a fight has *just* finished. Running this
 * script on demand (or manual cron) is safer than polling blindly.
 */
import { createClient } from "@supabase/supabase-js";
import {
  fetchBcOfficialEventCard,
  findBcSourceEventId,
  type BcOfficialFight,
} from "../lib/bc-official";
import { resolveScriptEnv } from "./_lib/script-env";

type EventRow = {
  id: string;
  name: string;
  date: string;
  status: "upcoming" | "live" | "completed";
  source_event_id: string | null;
};

type FighterNameRow = {
  id: string;
  name: string;
  name_en: string | null;
  name_ko: string | null;
  ring_name: string | null;
};

type FightRow = {
  id: string;
  event_id: string;
  fighter_a_id: string;
  fighter_b_id: string;
  winner_id: string | null;
  result_processed_at: string | null;
  fighter_a: FighterNameRow;
  fighter_b: FighterNameRow;
};

// Initialized once in `main()` after `resolveScriptEnv()` asserts the
// target env matches the operator's --env flag.
let supabase: ReturnType<typeof createClient>;

function normalizeName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function pairKey(a: string | null | undefined, b: string | null | undefined) {
  return [normalizeName(a), normalizeName(b)].sort().join("__");
}

function fighterAny(row: FighterNameRow, official: BcOfficialFight["fighterA"]) {
  const target = normalizeName(official.name);
  if (!target) return false;
  return [row.name, row.name_en, row.name_ko, row.ring_name]
    .map(normalizeName)
    .some((candidate) => candidate === target);
}

function parseArg(prefix: string): string | null {
  const match = process.argv.find((arg) => arg.startsWith(`${prefix}=`));
  return match ? match.slice(prefix.length + 1) : null;
}

async function resolveEvents(): Promise<EventRow[]> {
  const eventIdArg = parseArg("--event-id");

  let query = supabase
    .from("events")
    .select("id, name, date, status, source_event_id")
    .neq("status", "cancelled");

  if (eventIdArg) {
    query = query.eq("id", eventIdArg);
  } else {
    // Default: recent events where a winner might plausibly exist.
    // source_event_id must be set — without it we can't ask BC for
    // card data. Up to 30 events keeps the BC fetch budget tight.
    query = query
      .not("source_event_id", "is", null)
      .order("date", { ascending: false })
      .limit(30);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

async function loadEventFights(eventId: string): Promise<FightRow[]> {
  const { data, error } = await supabase
    .from("fights")
    .select(
      `
      id, event_id, fighter_a_id, fighter_b_id, winner_id, result_processed_at,
      fighter_a:fighters!fighter_a_id(id, name, name_en, name_ko, ring_name),
      fighter_b:fighters!fighter_b_id(id, name, name_en, name_ko, ring_name)
    `,
    )
    .eq("event_id", eventId);

  if (error) throw error;
  type RawRow = Record<string, unknown> & {
    fighter_a: unknown;
    fighter_b: unknown;
  };
  return ((data ?? []) as RawRow[]).map((row) => ({
    ...row,
    fighter_a: Array.isArray(row.fighter_a) ? row.fighter_a[0] : row.fighter_a,
    fighter_b: Array.isArray(row.fighter_b) ? row.fighter_b[0] : row.fighter_b,
  })) as FightRow[];
}

function chooseFightRow(official: BcOfficialFight, rows: FightRow[]) {
  const exactKey = pairKey(official.fighterA.name, official.fighterB.name);
  const exact = rows.find(
    (row) => pairKey(row.fighter_a.name, row.fighter_b.name) === exactKey,
  );
  if (exact) return exact;

  const scored = rows
    .map((row) => {
      const score =
        (fighterAny(row.fighter_a, official.fighterA) ||
        fighterAny(row.fighter_b, official.fighterA)
          ? 1
          : 0) +
        (fighterAny(row.fighter_a, official.fighterB) ||
        fighterAny(row.fighter_b, official.fighterB)
          ? 1
          : 0);
      return { row, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score === 2 ? scored[0].row : null;
}

/**
 * Maps the BC-side winner to a DB fighter id by looking at the
 * already-paired DB fight row. Returns `null` when:
 *
 *   - BC reports no winner for this fight yet
 *   - The winner's BC sourceId matches neither side's DB mapping
 *     (usually means sync-bc-event-card was never run, or the BC
 *     site changed the fighter pairing — let the admin handle it)
 */
function resolveWinnerDbId(
  official: BcOfficialFight,
  row: FightRow,
): string | null {
  if (!official.winnerSourceId) return null;

  // Pair BC A/B with the DB fighters by name — independent of the
  // column order in the fights table, which may not mirror BC order.
  const dbAMatches =
    fighterAny(row.fighter_a, official.fighterA) ||
    fighterAny(row.fighter_a, official.fighterA);
  const dbBMatches =
    fighterAny(row.fighter_b, official.fighterB) ||
    fighterAny(row.fighter_b, official.fighterB);

  const officialAIsDbA = fighterAny(row.fighter_a, official.fighterA);
  const officialAIsDbB = fighterAny(row.fighter_b, official.fighterA);
  const officialBIsDbA = fighterAny(row.fighter_a, official.fighterB);
  const officialBIsDbB = fighterAny(row.fighter_b, official.fighterB);

  // Cross-check: each BC side must resolve to exactly one DB fighter.
  if (!((officialAIsDbA || officialAIsDbB) && (officialBIsDbA || officialBIsDbB))) {
    return null;
  }
  // Unused vars silenced — dbAMatches/dbBMatches are the same info in
  // a different shape, kept for readability of the condition above.
  void dbAMatches;
  void dbBMatches;

  if (official.winnerSourceId === official.fighterA.sourceId) {
    if (officialAIsDbA) return row.fighter_a_id;
    if (officialAIsDbB) return row.fighter_b_id;
  }
  if (official.winnerSourceId === official.fighterB.sourceId) {
    if (officialBIsDbA) return row.fighter_a_id;
    if (officialBIsDbB) return row.fighter_b_id;
  }
  return null;
}

type Action =
  | { kind: "skip-scored"; row: FightRow; reason: string }
  | { kind: "skip-no-winner"; row: FightRow; reason: string }
  | { kind: "skip-unmatched"; official: BcOfficialFight; reason: string }
  | { kind: "same"; row: FightRow; winner_id: string }
  | { kind: "stage"; row: FightRow; winner_id: string; prev: string | null };

async function processEvent(event: EventRow): Promise<Action[]> {
  const sourceId =
    event.source_event_id ?? (await findBcSourceEventId(event.name));
  if (!sourceId) {
    console.log(`  [skip] ${event.name}: no source_event_id`);
    return [];
  }

  const [officials, dbRows] = await Promise.all([
    fetchBcOfficialEventCard(sourceId),
    loadEventFights(event.id),
  ]);

  const actions: Action[] = [];
  const availableRows = [...dbRows];

  for (const official of officials) {
    const row = chooseFightRow(official, availableRows);
    if (!row) {
      actions.push({
        kind: "skip-unmatched",
        official,
        reason: "no matching DB fight (run sync-bc-event-card first?)",
      });
      continue;
    }
    availableRows.splice(availableRows.findIndex((r) => r.id === row.id), 1);

    if (row.result_processed_at) {
      actions.push({
        kind: "skip-scored",
        row,
        reason: "result_processed_at already set",
      });
      continue;
    }

    const winner = resolveWinnerDbId(official, row);
    if (!winner) {
      actions.push({
        kind: "skip-no-winner",
        row,
        reason: official.winnerSourceId
          ? "BC winner doesn't map to either DB fighter"
          : "BC has no winner yet",
      });
      continue;
    }

    if (row.winner_id === winner) {
      actions.push({ kind: "same", row, winner_id: winner });
    } else {
      actions.push({ kind: "stage", row, winner_id: winner, prev: row.winner_id });
    }
  }

  return actions;
}

async function main() {
  const { supabaseUrl, serviceRoleKey } = await resolveScriptEnv();
  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const shouldApply = process.argv.includes("--apply");
  const events = await resolveEvents();

  console.log(
    `Mode: ${shouldApply ? "APPLY" : "dry-run"} · ${events.length} event(s) in scope`,
  );
  console.log("");

  let totalStaged = 0;
  let totalSame = 0;
  let totalSkipped = 0;

  for (const event of events) {
    console.log(`== ${event.name} (${event.date}, ${event.status}) ==`);
    const actions = await processEvent(event);
    for (const action of actions) {
      switch (action.kind) {
        case "skip-unmatched":
          console.log(
            `  [unmatched] ${action.official.fighterA.name} vs ${action.official.fighterB.name} — ${action.reason}`,
          );
          totalSkipped++;
          break;
        case "skip-scored":
          console.log(
            `  [scored] ${action.row.fighter_a.name} vs ${action.row.fighter_b.name} — ${action.reason}`,
          );
          totalSkipped++;
          break;
        case "skip-no-winner":
          console.log(
            `  [no-winner] ${action.row.fighter_a.name} vs ${action.row.fighter_b.name} — ${action.reason}`,
          );
          totalSkipped++;
          break;
        case "same":
          console.log(
            `  [no-op] ${action.row.fighter_a.name} vs ${action.row.fighter_b.name} (winner already staged)`,
          );
          totalSame++;
          break;
        case "stage": {
          const winnerName =
            action.row.fighter_a_id === action.winner_id
              ? action.row.fighter_a.name
              : action.row.fighter_b.name;
          console.log(
            `  [stage] ${action.row.fighter_a.name} vs ${action.row.fighter_b.name} → ${winnerName}` +
              (action.prev ? ` (was: ${action.prev})` : ""),
          );
          if (shouldApply) {
            const { error } = await supabase
              .from("fights")
              .update({ winner_id: action.winner_id })
              .eq("id", action.row.id)
              .is("result_processed_at", null); // belt-and-suspenders: reject if admin scored mid-flight
            if (error) {
              console.error(`    ! update failed: ${error.message}`);
            }
          }
          totalStaged++;
          break;
        }
      }
    }
    console.log("");
  }

  console.log(`Summary: ${totalStaged} staged · ${totalSame} already-correct · ${totalSkipped} skipped`);
  if (!shouldApply && totalStaged > 0) {
    console.log("Dry run — re-run with --apply to write.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
