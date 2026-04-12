#!/usr/bin/env node
// One-off data fix: backfill `fighters.weight_class` for fighters that
// are missing it, by inferring from their opponents in the `fights` table.
//
// Strategy:
//   1. Pull every fighter, split into "have weight_class" and "missing".
//   2. Pull every fight; for each missing fighter collect the multiset of
//      weight classes their opponents have.
//   3. Three buckets:
//        a. Single opponent weight class      → safe auto-fix
//        b. Multiple opponent weight classes  → pick the most frequent
//                                               (tie-break alphabetical),
//                                               flag the choice in output
//        c. No opponent weight class          → cannot infer, skip
//   4. Dry-run by default; --apply to execute the UPDATEs.
//
// Usage:
//   node scripts/ops/fix-fighter-weight.mjs            # dry run
//   node scripts/ops/fix-fighter-weight.mjs --apply    # execute

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

const apply = process.argv.includes("--apply");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Strip ranking/championship/weight noise from a weight_class string so
 *  we group by base division. e.g. "라이트급 #16" / "라이트급 70kg" / "라이트급 #C"
 *  all collapse to "라이트급". */
function normalizeWeightClass(raw) {
  if (!raw) return null;
  const cleaned = raw
    .replace(/#C/i, "")
    .replace(/#\d+/, "")
    .replace(/\d+(\.\d+)?\s*kg/i, "")
    .trim();
  return cleaned || null;
}

async function main() {
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Mode:         ${apply ? "APPLY" : "DRY RUN"}`);
  console.log("");

  const { data: fighters, error: fightersError } = await supabase
    .from("fighters")
    .select("id, name, ring_name, weight_class")
    .limit(2000);

  if (fightersError) {
    console.error("fighters load failed:", fightersError.message);
    process.exit(1);
  }

  const all = fighters ?? [];
  const fighterWeight = new Map(
    all.map((f) => [f.id, normalizeWeightClass(f.weight_class)]),
  );
  const missing = all.filter(
    (f) => !f.weight_class || f.weight_class.trim() === "",
  );

  console.log(`Total fighters:           ${all.length}`);
  console.log(`Missing weight_class:     ${missing.length}`);
  console.log("");

  if (missing.length === 0) {
    console.log("Nothing to fix. ✓");
    return;
  }

  // Pull all fights via paging.
  const allFights = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data: page, error } = await supabase
      .from("fights")
      .select("fighter_a_id, fighter_b_id")
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

  // Build a multiset (Map<weight, count>) of opponent weight classes per
  // missing fighter.
  const inferred = new Map(); // fighterId → Map<weight, count>
  for (const fight of allFights) {
    const a = fight.fighter_a_id;
    const b = fight.fighter_b_id;
    const wa = fighterWeight.get(a);
    const wb = fighterWeight.get(b);
    if (!wa && wb) {
      const m = inferred.get(a) ?? new Map();
      m.set(wb, (m.get(wb) ?? 0) + 1);
      inferred.set(a, m);
    }
    if (!wb && wa) {
      const m = inferred.get(b) ?? new Map();
      m.set(wa, (m.get(wa) ?? 0) + 1);
      inferred.set(b, m);
    }
  }

  // Categorize.
  const updates = []; // { id, name, oldNull, newWeight, source: 'single'|'most-frequent', candidates }
  const skipped = []; // { id, name }

  for (const fighter of missing) {
    const m = inferred.get(fighter.id);
    if (!m || m.size === 0) {
      skipped.push(fighter);
      continue;
    }
    if (m.size === 1) {
      const [weight] = [...m.keys()];
      updates.push({
        id: fighter.id,
        name: fighter.ring_name || fighter.name,
        newWeight: weight,
        source: "single",
        candidates: [{ weight, count: m.get(weight) }],
      });
      continue;
    }
    // Multiple candidates — pick most frequent, tie-break alphabetical.
    const sorted = [...m.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
    const [winningWeight] = sorted[0];
    updates.push({
      id: fighter.id,
      name: fighter.ring_name || fighter.name,
      newWeight: winningWeight,
      source: "most-frequent",
      candidates: sorted.map(([weight, count]) => ({ weight, count })),
    });
  }

  console.log(`Will update:              ${updates.length}`);
  console.log(`  – single source:        ${updates.filter((u) => u.source === "single").length}`);
  console.log(`  – most-frequent pick:   ${updates.filter((u) => u.source === "most-frequent").length}`);
  console.log(`Cannot infer (skipped):   ${skipped.length}`);
  console.log("");

  // Print every planned update so the operator can spot anything weird.
  for (const u of updates) {
    if (u.source === "single") {
      console.log(`  ${u.name.padEnd(28)} → ${u.newWeight}`);
    } else {
      const breakdown = u.candidates
        .map((c) => `${c.weight}×${c.count}`)
        .join(" ");
      console.log(`  ${u.name.padEnd(28)} → ${u.newWeight}  [${breakdown}]`);
    }
  }
  console.log("");

  if (skipped.length > 0) {
    console.log(`Skipped (${skipped.length}) — no opponent weight class on file:`);
    for (const fighter of skipped) {
      const display = fighter.ring_name || fighter.name;
      console.log(`  ${display}`);
    }
    console.log("");
  }

  if (!apply) {
    console.log("Dry run complete. Re-run with --apply to execute.");
    return;
  }

  console.log("Applying updates…");
  let success = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from("fighters")
      .update({ weight_class: u.newWeight })
      .eq("id", u.id);
    if (error) {
      console.error(`  ✗ ${u.id} (${u.name}): ${error.message}`);
    } else {
      success += 1;
    }
  }
  console.log("");
  console.log(`Updated ${success}/${updates.length} fighter(s).`);
  console.log(`${skipped.length} still missing — handle separately.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
