#!/usr/bin/env node
// One-off data fix: populate `fighters.name_en` (and normalize
// `name_ko`) for every Korean fighter that currently has Hangul in `name`
// but no English form on file. Romanization is done locally via the
// `romanize-korean.mjs` helper, which prefers conventional surname
// spellings ("Kim", "Lee", …) over strict Revised Romanization ("Gim",
// "I", …) so the results read like an English-language fight bio.
//
// Usage:
//   node scripts/ops/fix-korean-names.mjs            # dry run
//   node scripts/ops/fix-korean-names.mjs --apply    # execute

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  romanizeKoreanName,
  normalizeKoreanName,
} from "./lib/romanize-korean.mjs";

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

const apply = process.argv.includes("--apply");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const HANGUL_RE = /[\uAC00-\uD7AF]/;

async function main() {
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Mode:         ${apply ? "APPLY" : "DRY RUN"}`);
  console.log("");

  const { data: fighters, error } = await supabase
    .from("fighters")
    .select("id, name, ring_name, name_en, name_ko, nationality")
    .order("name", { ascending: true })
    .limit(2000);

  if (error) {
    console.error("fighters load failed:", error.message);
    process.exit(1);
  }

  const all = fighters ?? [];
  console.log(`Total fighters: ${all.length}`);

  const updates = []; // { id, label, before: { name_en, name_ko }, after: { name_en, name_ko } }
  const skipped = [];

  for (const fighter of all) {
    const sourceName = fighter.name?.trim();
    if (!sourceName) {
      skipped.push({ fighter, reason: "no name" });
      continue;
    }
    if (!HANGUL_RE.test(sourceName)) {
      // Latin or other-script name — leave as is.
      continue;
    }

    // Only romanize names that are tagged as Korean. A few records have
    // Japanese / Mongolian names transliterated into Hangul (e.g.
    // "기노시타 타케아키") with the wrong nationality, but those should be
    // hand-fixed instead of force-romanizing as Korean.
    if (fighter.nationality?.toUpperCase() !== "KR") {
      skipped.push({
        fighter,
        reason: `nationality=${fighter.nationality ?? "null"}`,
      });
      continue;
    }

    // Korean names are normally a single Hangul block with no internal
    // spaces. A space inside the name is a strong signal the record is a
    // foreign name written in Hangul, so skip and surface for manual review.
    if (/\s/.test(sourceName)) {
      skipped.push({ fighter, reason: "has whitespace in name" });
      continue;
    }

    const newNameEn = romanizeKoreanName(sourceName);
    const newNameKo = normalizeKoreanName(sourceName);

    if (!newNameEn || !newNameKo) {
      skipped.push({ fighter, reason: "romanize returned null" });
      continue;
    }

    const currentNameEn = fighter.name_en?.trim() ?? "";
    const currentNameKo = fighter.name_ko?.trim() ?? "";

    // Skip if already in the target form so we never clobber a manually
    // edited row.
    const enChanged = currentNameEn !== newNameEn;
    const koChanged = currentNameKo !== newNameKo;
    if (!enChanged && !koChanged) continue;

    updates.push({
      id: fighter.id,
      label: sourceName,
      ringName: fighter.ring_name ?? "",
      before: { name_en: fighter.name_en, name_ko: fighter.name_ko },
      after: { name_en: newNameEn, name_ko: newNameKo },
      enChanged,
      koChanged,
    });
  }

  console.log(`Will update:    ${updates.length}`);
  console.log(`Skipped:        ${skipped.length}`);
  console.log("");

  // Print every planned change so the operator can spot anything weird.
  for (const u of updates) {
    const ring = u.ringName ? ` (${u.ringName})` : "";
    console.log(`  ${u.label}${ring}`);
    if (u.enChanged) {
      console.log(`    name_en: ${JSON.stringify(u.before.name_en)} → ${JSON.stringify(u.after.name_en)}`);
    }
    if (u.koChanged) {
      console.log(`    name_ko: ${JSON.stringify(u.before.name_ko)} → ${JSON.stringify(u.after.name_ko)}`);
    }
  }
  console.log("");

  if (skipped.length > 0) {
    console.log(`Skipped (${skipped.length}):`);
    for (const s of skipped) {
      console.log(`  ${s.fighter.name ?? "(no name)"} — ${s.reason}`);
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
    const patch = {};
    if (u.enChanged) patch.name_en = u.after.name_en;
    if (u.koChanged) patch.name_ko = u.after.name_ko;
    const { error: updateError } = await supabase
      .from("fighters")
      .update(patch)
      .eq("id", u.id);
    if (updateError) {
      console.error(`  ✗ ${u.id} (${u.label}): ${updateError.message}`);
    } else {
      success += 1;
    }
  }
  console.log("");
  console.log(`Updated ${success}/${updates.length} fighter(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
