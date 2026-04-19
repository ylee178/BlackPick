import { createClient } from "@supabase/supabase-js";
import { fetchBcOfficialEventCard, findBcSourceEventId, type BcOfficialFight } from "../lib/bc-official";
import { resolveScriptEnv } from "./_lib/script-env";

type FighterRow = {
  id: string;
  name: string;
  name_en: string | null;
  name_ko: string | null;
  ring_name: string | null;
  record: string | null;
  nationality: string | null;
  weight_class: string | null;
  source_fighter_id: string | null;
};

type FightRow = {
  id: string;
  start_time: string;
  fighter_a_id: string;
  fighter_b_id: string;
  fighter_a: FighterRow;
  fighter_b: FighterRow;
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

function normalizeLatinNameTokens(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/gu)
    .filter(Boolean)
    .sort()
    .join("__");
}

function isLatinName(value: string | null | undefined) {
  return !!value && /[A-Za-z]/.test(value);
}

function deriveWeightClass(fight: BcOfficialFight, side: "fighterA" | "fighterB") {
  const division = fight[side].division?.replace(/\s*#\d+\s*$/u, "").trim();
  if (division) return division;
  const bout = fight.boutLabel?.replace(/\[MAIN EVENT\]\s*/i, "").replace(/\s*BOUT\s*$/i, "").trim();
  return bout || null;
}

function pairKey(a: string | null | undefined, b: string | null | undefined) {
  return [normalizeName(a), normalizeName(b)].sort().join("__");
}

async function resolveTargetEvent() {
  const argEventId = process.argv.find((arg) => arg.startsWith("--event-id="))?.split("=")[1];
  const argEventName = process.argv.find((arg) => arg.startsWith("--event-name="))?.split("=")[1];

  let query = supabase.from("events").select("id, name, date, status, source_event_id");
  if (argEventId) {
    query = query.eq("id", argEventId);
  } else if (argEventName) {
    query = query.eq("name", argEventName);
  } else {
    query = query.eq("status", "upcoming").order("date", { ascending: true }).limit(1);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Target event not found");
  return data;
}

async function loadEventFights(eventId: string): Promise<FightRow[]> {
  const { data, error } = await supabase
    .from("fights")
    .select(`
      id, start_time, fighter_a_id, fighter_b_id,
      fighter_a:fighters!fighter_a_id(id, name, name_en, name_ko, ring_name, record, nationality, weight_class, source_fighter_id),
      fighter_b:fighters!fighter_b_id(id, name, name_en, name_ko, ring_name, record, nationality, weight_class, source_fighter_id)
    `)
    .eq("event_id", eventId)
    .order("start_time", { ascending: true });

  if (error) throw error;
  type RawFightRow = Record<string, unknown> & {
    fighter_a: unknown;
    fighter_b: unknown;
  };
  return ((data ?? []) as RawFightRow[]).map((row) => ({
    ...row,
    fighter_a: Array.isArray(row.fighter_a) ? row.fighter_a[0] : row.fighter_a,
    fighter_b: Array.isArray(row.fighter_b) ? row.fighter_b[0] : row.fighter_b,
  })) as FightRow[];
}

async function loadAllFighters(): Promise<FighterRow[]> {
  const { data, error } = await supabase
    .from("fighters")
    .select("id, name, name_en, name_ko, ring_name, record, nationality, weight_class, source_fighter_id")
    .limit(2000);

  if (error) throw error;
  return (data ?? []) as FighterRow[];
}

function pickBestExistingFighter(
  fighters: FighterRow[],
  official: BcOfficialFight["fighterA"] | BcOfficialFight["fighterB"],
  preferredFighterIds: Set<string>,
) {
  const normalizedOfficialName = normalizeName(official.name);
  const normalizedOfficialTokenKey = normalizeLatinNameTokens(official.name);
  const normalizedOfficialRing = normalizeName(official.ringName);

  const candidates = fighters
    .filter((fighter) => {
      const values = [fighter.name, fighter.name_en, fighter.name_ko];
      const hasExact = values.some((value) => normalizeName(value) === normalizedOfficialName);
      const hasTokenMatch =
        !!normalizedOfficialTokenKey &&
        values
          .filter((value) => isLatinName(value))
          .some((value) => normalizeLatinNameTokens(value) === normalizedOfficialTokenKey);
      const hasRingMatch =
        !!normalizedOfficialRing && normalizeName(fighter.ring_name) === normalizedOfficialRing;
      return hasExact || hasTokenMatch || hasRingMatch;
    })
    .map((fighter) => {
      const values = [fighter.name, fighter.name_en, fighter.name_ko];
      let score = 0;
      if (preferredFighterIds.has(fighter.id)) score += 100;
      if (values.some((value) => normalizeName(value) === normalizedOfficialName)) score += 10;
      if (
        normalizedOfficialTokenKey &&
        values
          .filter((value) => isLatinName(value))
          .some((value) => normalizeLatinNameTokens(value) === normalizedOfficialTokenKey)
      ) {
        score += 5;
      }
      if (normalizedOfficialRing && normalizeName(fighter.ring_name) === normalizedOfficialRing) score += 3;
      if (official.nationality && fighter.nationality === official.nationality) score += 1;
      return { fighter, score };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.fighter ?? null;
}

async function findOrCreateFighter(
  officialFight: BcOfficialFight,
  side: "fighterA" | "fighterB",
  fighters: FighterRow[],
  shouldApply: boolean,
  preferredFighterIds: Set<string>,
) {
  const official = officialFight[side];
  let existing = pickBestExistingFighter(fighters, official, preferredFighterIds);

  const weightClass = deriveWeightClass(officialFight, side);

  if (!existing) {
    if (!shouldApply) {
      console.log(`+ would create fighter: ${official.name}`);
      return {
        id: `__virtual__${side}_${official.sourceId}`,
        name: official.name ?? "Unknown",
        name_en: isLatinName(official.name) ? official.name : null,
        name_ko: !isLatinName(official.name) ? official.name : null,
        ring_name: official.ringName,
        record: official.record,
        nationality: official.nationality,
        weight_class: weightClass,
        source_fighter_id: official.sourceId || null,
      } satisfies FighterRow;
    }

    const insertPayload = {
      name: official.name ?? "Unknown",
      name_en: isLatinName(official.name) ? official.name : null,
      name_ko: !isLatinName(official.name) ? official.name : null,
      ring_name: official.ringName,
      record: official.record,
      nationality: official.nationality,
      weight_class: weightClass,
      source_fighter_id: official.sourceId || null,
    };
    const { data, error } = await supabase.from("fighters").insert(insertPayload).select("*").single();
    if (error) throw error;
    existing = data as FighterRow;
    fighters.push(existing);
    console.log(`+ created fighter: ${official.name} (${existing.id})`);
  } else {
    const patch: Partial<FighterRow> = {};
    if (official.name && official.name !== existing.name) patch.name = official.name;
    if (official.ringName && official.ringName !== existing.ring_name) patch.ring_name = official.ringName;
    if (official.record && official.record !== existing.record) patch.record = official.record;
    if (official.nationality && official.nationality !== existing.nationality) patch.nationality = official.nationality;
    if (weightClass && weightClass !== existing.weight_class) patch.weight_class = weightClass;
    if (isLatinName(official.name) && official.name && official.name !== existing.name_en) patch.name_en = official.name;
    if (!isLatinName(official.name) && official.name && official.name !== existing.name_ko) patch.name_ko = official.name;
    // Backfill the BC seq when it's missing on an existing row. Never
    // overwrite an already-set value — that would mask a real mismatch
    // that the sync script should log and let a human resolve.
    if (official.sourceId && !existing.source_fighter_id) {
      patch.source_fighter_id = official.sourceId;
    }

    if (Object.keys(patch).length > 0) {
      if (!shouldApply) {
        console.log(`~ would update fighter metadata: ${official.name}`);
        return { ...existing, ...patch };
      }

      const { error } = await supabase.from("fighters").update(patch).eq("id", existing.id);
      if (error) throw error;
      Object.assign(existing, patch);
      console.log(`~ updated fighter metadata: ${official.name}`);
    }
  }

  return existing;
}

function chooseFightRow(officialFight: BcOfficialFight, availableRows: FightRow[]) {
  const exactKey = pairKey(officialFight.fighterA.name, officialFight.fighterB.name);
  const exact = availableRows.find(
    (row) => pairKey(row.fighter_a.name, row.fighter_b.name) === exactKey,
  );
  if (exact) return exact;

  const overlap = availableRows
    .map((row) => {
      const names = [normalizeName(row.fighter_a.name), normalizeName(row.fighter_b.name)];
      const score =
        (names.includes(normalizeName(officialFight.fighterA.name)) ? 1 : 0) +
        (names.includes(normalizeName(officialFight.fighterB.name)) ? 1 : 0);
      return { row, score };
    })
    .sort((a, b) => b.score - a.score);

  return overlap[0]?.row ?? null;
}

async function main() {
  const { supabaseUrl, serviceRoleKey } = await resolveScriptEnv();
  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const shouldApply = process.argv.includes("--apply");
  const event = await resolveTargetEvent();
  const sourceEventId = event.source_event_id ?? (await findBcSourceEventId(event.name));

  if (!sourceEventId) {
    throw new Error(`Could not resolve source_event_id for ${event.name}`);
  }

  const [officialFights, currentRows, fighters] = await Promise.all([
    fetchBcOfficialEventCard(sourceEventId),
    loadEventFights(event.id),
    loadAllFighters(),
  ]);
  const preferredFighterIds = new Set(
    currentRows.flatMap((row) => [row.fighter_a_id, row.fighter_b_id]),
  );

  console.log(`Event: ${event.name}`);
  console.log(`Official source_event_id: ${sourceEventId}`);
  console.log(`Official fights: ${officialFights.length}, current fights: ${currentRows.length}`);

  if (officialFights.length !== currentRows.length) {
    throw new Error(`Fight count mismatch: official=${officialFights.length} current=${currentRows.length}`);
  }

  const unmatchedRows = [...currentRows];
  const assignments = officialFights.map((officialFight, index) => {
    const row = chooseFightRow(officialFight, unmatchedRows);
    if (!row) throw new Error(`Could not match row for ${officialFight.fighterA.name} vs ${officialFight.fighterB.name}`);
    unmatchedRows.splice(unmatchedRows.findIndex((candidate) => candidate.id === row.id), 1);
    return { row, officialFight, index };
  });

  for (const { row, officialFight, index } of assignments) {
    const fighterA = await findOrCreateFighter(
      officialFight,
      "fighterA",
      fighters,
      shouldApply,
      preferredFighterIds,
    );
    const fighterB = await findOrCreateFighter(
      officialFight,
      "fighterB",
      fighters,
      shouldApply,
      preferredFighterIds,
    );
    const participantSetChanged =
      new Set([row.fighter_a_id, row.fighter_b_id]).size !== new Set([fighterA.id, fighterB.id]).size ||
      ![row.fighter_a_id, row.fighter_b_id].every((id) => [fighterA.id, fighterB.id].includes(id));

    console.log(
      `${index + 1}. ${row.fighter_a.name} vs ${row.fighter_b.name} -> ${officialFight.fighterA.name} vs ${officialFight.fighterB.name}${participantSetChanged ? " [participants changed]" : ""}`,
    );

    if (!shouldApply) continue;

    if (participantSetChanged) {
      const { error: deletePredictionsError } = await supabase.from("predictions").delete().eq("fight_id", row.id);
      if (deletePredictionsError) throw deletePredictionsError;
      console.log(`  - cleared predictions for fight ${row.id}`);
    }

    const { error: fightUpdateError } = await supabase
      .from("fights")
      .update({
        fighter_a_id: fighterA.id,
        fighter_b_id: fighterB.id,
      })
      .eq("id", row.id);

    if (fightUpdateError) throw fightUpdateError;
  }

  if (shouldApply) {
    const { error: eventUpdateError } = await supabase
      .from("events")
      .update({ source_event_id: sourceEventId })
      .eq("id", event.id);

    if (eventUpdateError) throw eventUpdateError;
    console.log(`Updated event.source_event_id -> ${sourceEventId}`);
  } else {
    console.log("Dry run only. Re-run with --apply to write changes.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
