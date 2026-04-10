#!/usr/bin/env node
// One-off data fix: subtract a fixed hour offset from every upcoming/live
// fight on a specific event. The BlackCup 8강 (Mongolia vs China) event had
// its fight start_times authored through the old admin form before the KST
// parsing fix, and ended up stored 3 hours later than the real venue time.
//
// Usage:
//   node scripts/ops/fix-fight-times-offset.mjs                # dry run
//   node scripts/ops/fix-fight-times-offset.mjs --apply        # execute
//
// Loads .env.local automatically (dev creds). To run against prod, source
// .env first and pass --apply explicitly.

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
    // Missing file — silent.
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const TARGET_EVENT_ID = "fc9df266-608d-4efa-a1b4-e9ff07a92529";
const OFFSET_HOURS = -3; // subtract 3 hours to correct the +3h drift
const OFFSET_MS = OFFSET_HOURS * 60 * 60 * 1000;

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

function formatInZone(iso, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(iso));
}

async function main() {
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Target event: ${TARGET_EVENT_ID}`);
  console.log(`Offset:       ${OFFSET_HOURS}h`);
  console.log(`Mode:         ${apply ? "APPLY" : "DRY RUN"}`);
  console.log("");

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, date, status")
    .eq("id", TARGET_EVENT_ID)
    .maybeSingle();

  if (eventError || !event) {
    console.error("Target event not found:", eventError?.message ?? "missing row");
    process.exit(1);
  }

  console.log(`Event: ${event.name} (${event.date}, ${event.status})`);
  console.log("");

  const { data: fights, error: fightsError } = await supabase
    .from("fights")
    .select("id, start_time, status, fighter_a:fighters!fighter_a_id(name), fighter_b:fighters!fighter_b_id(name)")
    .eq("event_id", event.id)
    .in("status", ["upcoming", "live"])
    .order("start_time", { ascending: true });

  if (fightsError) {
    console.error("Failed to load fights:", fightsError.message);
    process.exit(1);
  }

  if (!fights || fights.length === 0) {
    console.log("No upcoming/live fights for this event.");
    return;
  }

  console.log(`Found ${fights.length} upcoming/live fight(s).`);
  console.log("");

  const updates = fights.map((fight) => {
    const oldMs = new Date(fight.start_time).getTime();
    const newIso = new Date(oldMs + OFFSET_MS).toISOString();
    const a = Array.isArray(fight.fighter_a) ? fight.fighter_a[0] : fight.fighter_a;
    const b = Array.isArray(fight.fighter_b) ? fight.fighter_b[0] : fight.fighter_b;
    return {
      id: fight.id,
      label: `${a?.name ?? "?"} vs ${b?.name ?? "?"}`,
      old: fight.start_time,
      new: newIso,
    };
  });

  for (const u of updates) {
    const oldKst = formatInZone(u.old, "Asia/Seoul");
    const newKst = formatInZone(u.new, "Asia/Seoul");
    const newSyd = formatInZone(u.new, "Australia/Sydney");
    console.log(`  ${u.label}`);
    console.log(`    ${u.old}  (Seoul ${oldKst})`);
    console.log(`    → ${u.new}  (Seoul ${newKst}, Sydney ${newSyd})`);
  }
  console.log("");

  if (!apply) {
    console.log("Dry run complete. Re-run with --apply to execute.");
    return;
  }

  console.log("Applying updates…");
  let success = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from("fights")
      .update({ start_time: u.new })
      .eq("id", u.id);
    if (error) {
      console.error(`  ✗ ${u.id}: ${error.message}`);
    } else {
      success += 1;
      console.log(`  ✓ ${u.id}`);
    }
  }
  console.log("");
  console.log(`Updated ${success}/${updates.length} fight(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
