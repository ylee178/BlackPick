#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function main() {
  loadDotEnv();

  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );

  const checks = [
    ["users.preferred_language", () => supabase.from("users").select("preferred_language").limit(1)],
    ["admin_users", () => supabase.from("admin_users").select("user_id").limit(1)],
    ["events.completed_at", () => supabase.from("events").select("completed_at").limit(1)],
    ["comment_likes", () => supabase.from("comment_likes").select("comment_id").limit(1)],
    [
      "fights.result_processed_at",
      () => supabase.from("fights").select("result_processed_at").limit(1),
    ],
    [
      "fighter_comment_translations",
      () => supabase.from("fighter_comment_translations").select("id").limit(1),
    ],
  ];

  let failed = false;

  for (const [label, run] of checks) {
    const { error } = await run();
    if (error) {
      failed = true;
      console.log(`MISSING ${label}: ${error.message}`);
      continue;
    }

    console.log(`OK ${label}`);
  }

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
