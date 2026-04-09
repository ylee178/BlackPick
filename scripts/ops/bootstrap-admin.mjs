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

  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error("Usage: node scripts/ops/bootstrap-admin.mjs <email>");
  }

  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );

  let page = 1;
  const perPage = 200;
  let matchedUser = null;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    matchedUser = data.users.find((user) => user.email?.toLowerCase() === email) ?? null;
    if (matchedUser) {
      break;
    }

    const totalPages = data.total ? Math.ceil(data.total / perPage) : null;
    if (data.users.length < perPage || (totalPages !== null && page >= totalPages)) {
      break;
    }

    page += 1;
  }

  if (!matchedUser) {
    throw new Error(`No auth user found for ${email}`);
  }

  const { error: insertError } = await supabase
    .from("admin_users")
    .upsert({ user_id: matchedUser.id }, { onConflict: "user_id" });

  if (insertError) {
    throw insertError;
  }

  console.log(`Admin access granted to ${email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
