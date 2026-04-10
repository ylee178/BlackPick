#!/usr/bin/env node
/**
 * i18n key integrity check.
 *
 * Catches the class of bug where one locale file is missing a key that the
 * code calls `t("...")` on. Without this check, that key silently falls
 * through to the raw key string in production for that locale.
 *
 * Strategy:
 *   1. Read all 7 message files.
 *   2. Flatten each into a Set of dotted keys (e.g. "auth.googleLogin").
 *   3. Pick the locale with the most keys as the "canonical" set.
 *   4. For each other locale, compute (canonical \ this) and (this \ canonical).
 *   5. Fail if any non-empty diff.
 *
 * Run via:
 *   node scripts/check-i18n-keys.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MESSAGES_DIR = "src/messages";

function flatten(obj, prefix = "") {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      for (const subKey of flatten(v, full)) {
        keys.add(subKey);
      }
    } else {
      keys.add(full);
    }
  }
  return keys;
}

function loadLocaleFiles() {
  const files = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith(".json"));
  const locales = {};
  for (const file of files) {
    const locale = file.replace(/\.json$/, "");
    const raw = readFileSync(join(MESSAGES_DIR, file), "utf-8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error(`❌ ${file} is not valid JSON: ${err.message}`);
      process.exit(2);
    }
    locales[locale] = flatten(parsed);
  }
  return locales;
}

function setDiff(a, b) {
  const result = new Set();
  for (const x of a) {
    if (!b.has(x)) result.add(x);
  }
  return result;
}

function main() {
  console.log("🔍 BlackPick i18n key integrity check");
  console.log();

  const locales = loadLocaleFiles();
  const localeNames = Object.keys(locales).sort();

  if (localeNames.length === 0) {
    console.error("❌ no message files found in", MESSAGES_DIR);
    process.exit(2);
  }

  // Pick the locale with the most keys as canonical. (Usually `en`.)
  let canonical = localeNames[0];
  for (const name of localeNames) {
    if (locales[name].size > locales[canonical].size) {
      canonical = name;
    }
  }

  const canonicalKeys = locales[canonical];
  console.log(`  Canonical locale: ${canonical} (${canonicalKeys.size} keys)`);
  console.log();

  let totalDrift = 0;

  for (const name of localeNames) {
    if (name === canonical) {
      console.log(`  ${name.padEnd(8)} ${locales[name].size} keys (canonical)`);
      continue;
    }
    const missing = setDiff(canonicalKeys, locales[name]);
    const extra = setDiff(locales[name], canonicalKeys);
    const drift = missing.size + extra.size;
    totalDrift += drift;

    const sym = drift === 0 ? "✓" : "✗";
    console.log(
      `  ${name.padEnd(8)} ${String(locales[name].size).padStart(4)} keys  ${sym}` +
        (drift === 0 ? "" : `  missing=${missing.size}  extra=${extra.size}`),
    );

    if (missing.size > 0) {
      const sample = [...missing].slice(0, 5);
      console.log(`           missing in ${name}: ${sample.join(", ")}${missing.size > 5 ? ", ..." : ""}`);
    }
    if (extra.size > 0) {
      const sample = [...extra].slice(0, 5);
      console.log(`           extra in ${name}:   ${sample.join(", ")}${extra.size > 5 ? ", ..." : ""}`);
    }
  }

  console.log();
  if (totalDrift === 0) {
    console.log("✅ All locales have identical key sets.");
    process.exit(0);
  }

  console.log(`❌ Found ${totalDrift} key drift(s) across locales.`);
  console.log("💡 Add the missing keys (or remove the extras) so all locales match.");
  process.exit(1);
}

main();
