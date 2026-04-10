#!/usr/bin/env node
// One-off diagnostic: dumps every upcoming/live fight with its start_time
// rendered in multiple timezones, so we can visually identify which fight a
// user is referring to when they report the wrong displayed time.
//
// Usage:
//   node scripts/ops/audit-fight-times.mjs
//
// Loads .env.local automatically (dev creds). For prod, source .env before
// running.

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
    // File missing — silent; caller should have already exported envs.
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

function kstDateString(iso) {
  // Manual UTC+9 addition to avoid Date locale quirks on the server side.
  const ms = new Date(iso).getTime() + 9 * 60 * 60 * 1000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${dd}`;
}

async function main() {
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log("");

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, name, date, status")
    .in("status", ["upcoming", "live"])
    .order("date", { ascending: true });

  if (eventsError) {
    console.error("Failed to load events:", eventsError.message);
    process.exit(1);
  }

  if (!events || events.length === 0) {
    console.log("No upcoming/live events.");
    return;
  }

  for (const event of events) {
    console.log(`═══ ${event.name} (${event.date}, ${event.status}) ═══`);
    console.log(`    id=${event.id}`);

    const { data: fights, error: fightsError } = await supabase
      .from("fights")
      .select("id, start_time, fighter_a_id, fighter_b_id, status, fighter_a:fighters!fighter_a_id(name), fighter_b:fighters!fighter_b_id(name)")
      .eq("event_id", event.id)
      .order("start_time", { ascending: true });

    if (fightsError) {
      console.error(`  load failed: ${fightsError.message}`);
      continue;
    }

    if (!fights || fights.length === 0) {
      console.log("  (no fights)");
      console.log("");
      continue;
    }

    for (const fight of fights) {
      const a = Array.isArray(fight.fighter_a) ? fight.fighter_a[0] : fight.fighter_a;
      const b = Array.isArray(fight.fighter_b) ? fight.fighter_b[0] : fight.fighter_b;
      const kstDate = kstDateString(fight.start_time);
      const dateMatch = kstDate === event.date;
      const dateMismatchFlag = dateMatch ? "" : `  ⚠ KST-date ${kstDate} ≠ event.date ${event.date}`;

      const kst = formatInZone(fight.start_time, "Asia/Seoul");
      const aest = formatInZone(fight.start_time, "Australia/Sydney");
      const utc = formatInZone(fight.start_time, "UTC");
      const la = formatInZone(fight.start_time, "America/Los_Angeles");

      console.log(
        `  ${a?.name ?? "?"} vs ${b?.name ?? "?"}  [${fight.status}]${dateMismatchFlag}`,
      );
      console.log(`    id=${fight.id}`);
      console.log(`    stored UTC: ${fight.start_time}`);
      console.log(`      Seoul:    ${kst}`);
      console.log(`      Sydney:   ${aest}`);
      console.log(`      LA:       ${la}`);
      console.log(`      UTC:      ${utc}`);
    }

    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
