#!/usr/bin/env node
// One-off diagnostic: list every fighter that has a NULL/empty weight_class
// and try to infer it from their fights' opponents (who often DO have a
// weight_class set). Read-only — does not write anything.
//
// Usage:
//   node scripts/ops/audit-fighter-weight.mjs
//
// Loads .env.local automatically (dev creds).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // missing — silent
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log("");

  // Pull every fighter so we can see the full picture, not just the ones
  // missing weight_class.
  const { data: fighters, error: fightersError } = await supabase
    .from("fighters")
    .select("id, name, ring_name, weight_class")
    .order("name", { ascending: true })
    .limit(2000);

  if (fightersError) {
    console.error("fighters load failed:", fightersError.message);
    process.exit(1);
  }

  const all = fighters ?? [];
  const missing = all.filter(
    (f) => !f.weight_class || f.weight_class.trim() === "",
  );

  console.log(`Total fighters:           ${all.length}`);
  console.log(`Missing weight_class:     ${missing.length}`);
  console.log(`Have weight_class:        ${all.length - missing.length}`);
  console.log("");

  if (missing.length === 0) {
    console.log("Nothing to fix. ✓");
    return;
  }

  // Build a map of fighter id → weight_class for fast lookup.
  const fighterWeight = new Map(
    all.map((f) => [f.id, f.weight_class?.trim() || null]),
  );

  // Pull every fight in the DB. Filtering by 159 fighter ids via PostgREST
  // `or` puts the entire id list into the URL and exceeds the practical
  // length limit, so it's simpler to just stream the full fights table —
  // it's small relative to the limit and we already need to inspect every
  // fight anyway.
  const allFights = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data: page, error } = await supabase
      .from("fights")
      .select("id, fighter_a_id, fighter_b_id, event_id")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("fights load failed:", error.message);
      process.exit(1);
    }
    if (!page || page.length === 0) break;
    allFights.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }
  const fights = allFights;

  // Build a map of fighter id → set of opponent weight classes seen.
  const inferred = new Map(); // fighterId → Set<weight_class>
  for (const fight of fights ?? []) {
    const a = fight.fighter_a_id;
    const b = fight.fighter_b_id;
    const wa = fighterWeight.get(a);
    const wb = fighterWeight.get(b);
    if (!wa && wb) {
      const set = inferred.get(a) ?? new Set();
      set.add(wb);
      inferred.set(a, set);
    }
    if (!wb && wa) {
      const set = inferred.get(b) ?? new Set();
      set.add(wa);
      inferred.set(b, set);
    }
  }

  // Print a categorized report.
  const fixable = [];
  const ambiguous = [];
  const noFightOpponentInfo = [];

  for (const fighter of missing) {
    const candidates = inferred.get(fighter.id);
    if (!candidates || candidates.size === 0) {
      noFightOpponentInfo.push(fighter);
    } else if (candidates.size === 1) {
      const wc = [...candidates][0];
      fixable.push({ fighter, weight: wc });
    } else {
      ambiguous.push({ fighter, candidates: [...candidates] });
    }
  }

  if (fixable.length > 0) {
    console.log(`══ FIXABLE (${fixable.length}) ══`);
    console.log("Single opponent weight class found — safe to copy:");
    console.log("");
    for (const { fighter, weight } of fixable) {
      const display = fighter.ring_name || fighter.name;
      console.log(`  ${display.padEnd(30)} → ${weight}`);
      console.log(`    id=${fighter.id}`);
    }
    console.log("");
  }

  if (ambiguous.length > 0) {
    console.log(`══ AMBIGUOUS (${ambiguous.length}) ══`);
    console.log("Opponents have multiple distinct weight classes — manual review:");
    console.log("");
    for (const { fighter, candidates } of ambiguous) {
      const display = fighter.ring_name || fighter.name;
      console.log(`  ${display.padEnd(30)} → ${candidates.join(" | ")}`);
      console.log(`    id=${fighter.id}`);
    }
    console.log("");
  }

  if (noFightOpponentInfo.length > 0) {
    console.log(`══ NO OPPONENT INFO (${noFightOpponentInfo.length}) ══`);
    console.log("No opponent with weight_class found — need another source:");
    console.log("");
    for (const fighter of noFightOpponentInfo) {
      const display = fighter.ring_name || fighter.name;
      console.log(`  ${display.padEnd(30)}  id=${fighter.id}`);
    }
    console.log("");
  }

  console.log("──────────────────────");
  console.log(`Summary: ${fixable.length} fixable, ${ambiguous.length} ambiguous, ${noFightOpponentInfo.length} unknown`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
