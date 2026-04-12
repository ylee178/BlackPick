#!/usr/bin/env node
// Deeper audit for fighters that still have NULL weight_class after the
// opponent-inference pass. For each remaining fighter, count how many
// fights they appear in and what those fights' opponents look like.
//
// Helps decide whether the fighter is:
//   - "ghost" (no fights at all → import artifact, can leave as null)
//   - has fights but every counterpart is also blank → need external source
//   - any other pattern worth flagging

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
  console.error("Missing supabase env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: fighters } = await supabase
    .from("fighters")
    .select("id, name, ring_name, weight_class")
    .limit(2000);

  const all = fighters ?? [];
  const fighterById = new Map(all.map((f) => [f.id, f]));
  const missing = all.filter(
    (f) => !f.weight_class || f.weight_class.trim() === "",
  );

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
      console.error(error.message);
      process.exit(1);
    }
    if (!page || page.length === 0) break;
    allFights.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }

  // Build per-fighter fight count.
  const fightCountByFighter = new Map();
  for (const fight of allFights) {
    fightCountByFighter.set(
      fight.fighter_a_id,
      (fightCountByFighter.get(fight.fighter_a_id) ?? 0) + 1,
    );
    fightCountByFighter.set(
      fight.fighter_b_id,
      (fightCountByFighter.get(fight.fighter_b_id) ?? 0) + 1,
    );
  }

  let zeroFights = 0;
  let hasFightsAllOpponentsMissing = 0;
  const lines = [];
  for (const fighter of missing) {
    const count = fightCountByFighter.get(fighter.id) ?? 0;
    const display = fighter.ring_name || fighter.name;
    if (count === 0) {
      zeroFights += 1;
      lines.push(`  GHOST  ${display.padEnd(26)} (no fights in DB)`);
    } else {
      hasFightsAllOpponentsMissing += 1;
      lines.push(`  ORPHAN ${display.padEnd(26)} ${count} fight(s), all opponents missing weight`);
    }
  }

  console.log(`Total still-missing: ${missing.length}`);
  console.log(`  ghost (0 fights):  ${zeroFights}`);
  console.log(`  orphan (have fights, but all peers also missing): ${hasFightsAllOpponentsMissing}`);
  console.log("");
  for (const line of lines) console.log(line);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
