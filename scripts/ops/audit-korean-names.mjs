#!/usr/bin/env node
// One-off diagnostic: dump every Korean fighter's name fields so we can see
// which records have malformed `name_en` (e.g. all caps, hyphenated,
// "LAST FIRST" order, missing) before deciding what the normalized form
// should be.
//
// Usage:
//   node scripts/ops/audit-korean-names.mjs
//
// Read-only.

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
  console.error("Missing env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const HANGUL_RE = /[\uAC00-\uD7AF]/;
const LATIN_RE = /[A-Za-z]/;

function isAllCaps(s) {
  return /[A-Z]/.test(s) && !/[a-z]/.test(s);
}

function categorizeNameEn(value) {
  if (!value) return "missing";
  const trimmed = value.trim();
  if (!trimmed) return "missing";
  if (HANGUL_RE.test(trimmed)) return "still-korean";
  if (!LATIN_RE.test(trimmed)) return "non-latin";
  if (trimmed.includes("-")) return "hyphenated";
  if (isAllCaps(trimmed)) return "all-caps";
  // Title Case roughly: every word starts with uppercase + rest lowercase.
  const words = trimmed.split(/\s+/);
  if (
    words.length >= 2 &&
    words.every((w) => /^[A-Z][a-z'’]*$/.test(w))
  ) {
    return "title-case";
  }
  if (words.length === 1) return "single-word";
  return "mixed";
}

async function main() {
  const { data: fighters, error } = await supabase
    .from("fighters")
    .select("id, name, ring_name, name_en, name_ko, nationality")
    .eq("nationality", "KR")
    .order("name", { ascending: true })
    .limit(2000);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  const all = fighters ?? [];
  console.log(`Korean fighters total: ${all.length}`);
  console.log("");

  const buckets = new Map();
  for (const fighter of all) {
    const cat = categorizeNameEn(fighter.name_en);
    const arr = buckets.get(cat) ?? [];
    arr.push(fighter);
    buckets.set(cat, arr);
  }

  for (const [cat, arr] of buckets) {
    console.log(`══ ${cat} (${arr.length}) ══`);
    for (const f of arr.slice(0, 50)) {
      const name = (f.name ?? "").padEnd(14);
      const ring = (f.ring_name ?? "").padEnd(14);
      const en = (f.name_en ?? "").padEnd(28);
      const ko = (f.name_ko ?? "").padEnd(14);
      console.log(`  name=${name} ring=${ring} en=${en} ko=${ko}`);
    }
    if (arr.length > 50) console.log(`  … ${arr.length - 50} more`);
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
