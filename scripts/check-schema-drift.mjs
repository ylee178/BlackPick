#!/usr/bin/env node
/**
 * Schema drift detection between BlackPick_Dev and BlackPick (prod) Supabase
 * projects. Catches the class of bug where a migration is applied to dev but
 * not to prod, and code that depends on the new schema then fails in prod.
 *
 * Specifically: reads `public.{users, fights, predictions, events, admin_users,
 * fighter_comments, fighter_comment_translations}` schema from both projects
 * via the Supabase Management API and diffs the columns. Exits non-zero on
 * any mismatch.
 *
 * Run via:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/check-schema-drift.mjs
 *
 * Or as part of `npm run check:schema-drift`.
 */

const PAT = process.env.SUPABASE_ACCESS_TOKEN;
if (!PAT) {
  console.error("❌ SUPABASE_ACCESS_TOKEN not set in env");
  process.exit(2);
}

const PROD_REF = process.env.SUPABASE_PROD_REF || "nxjwthpydynoecrvggih";
const DEV_REF = process.env.SUPABASE_DEV_REF || "lqyzivuxznybmlnlexmq";

// Tables we care about. Add new ones here as the schema grows.
// Keeping the list narrow keeps the signal high — drift in a tracking-only
// table doesn't break the app.
const CRITICAL_TABLES = [
  "users",
  "admin_users",
  "events",
  "fights",
  "predictions",
  "fighters",
  "fighter_comments",
  "comments",
];

const UA = "blackpick-cli/1.0 (schema-drift-check)";

async function fetchSchema(projectRef, table) {
  const sql = `
    SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '${table}'
    ORDER BY ordinal_position
  `;
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAT}`,
        "Content-Type": "application/json",
        "User-Agent": UA,
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${projectRef}/${table}: ${await res.text()}`);
  }
  return await res.json();
}

function columnKey(col) {
  return [
    col.column_name,
    col.data_type,
    col.is_nullable,
    col.column_default ?? "",
    col.character_maximum_length ?? "",
  ].join("|");
}

function diffTable(table, devCols, prodCols) {
  const devMap = new Map(devCols.map((c) => [c.column_name, c]));
  const prodMap = new Map(prodCols.map((c) => [c.column_name, c]));

  const diffs = [];

  // Columns in dev but not in prod
  for (const [name, col] of devMap.entries()) {
    if (!prodMap.has(name)) {
      diffs.push({
        kind: "missing_in_prod",
        table,
        column: name,
        detail: `${col.data_type} ${col.is_nullable === "NO" ? "NOT NULL" : "NULL"}`,
      });
    }
  }

  // Columns in prod but not in dev (less common but still drift)
  for (const [name, col] of prodMap.entries()) {
    if (!devMap.has(name)) {
      diffs.push({
        kind: "missing_in_dev",
        table,
        column: name,
        detail: `${col.data_type} ${col.is_nullable === "NO" ? "NOT NULL" : "NULL"}`,
      });
    }
  }

  // Columns in both but with different shape
  for (const [name, devCol] of devMap.entries()) {
    const prodCol = prodMap.get(name);
    if (!prodCol) continue;
    if (columnKey(devCol) !== columnKey(prodCol)) {
      diffs.push({
        kind: "shape_mismatch",
        table,
        column: name,
        detail: `dev=${columnKey(devCol)}  prod=${columnKey(prodCol)}`,
      });
    }
  }

  return diffs;
}

async function main() {
  console.log("🔍 BlackPick schema drift check");
  console.log(`   DEV  : ${DEV_REF}`);
  console.log(`   PROD : ${PROD_REF}`);
  console.log();

  const allDiffs = [];

  for (const table of CRITICAL_TABLES) {
    process.stdout.write(`  ${table.padEnd(32)} `);
    try {
      const [devCols, prodCols] = await Promise.all([
        fetchSchema(DEV_REF, table),
        fetchSchema(PROD_REF, table),
      ]);

      if (devCols.length === 0 && prodCols.length === 0) {
        console.log("⚠ table missing in both (skipped)");
        continue;
      }
      if (devCols.length === 0) {
        console.log("⚠ missing in DEV");
        allDiffs.push({ kind: "table_missing_in_dev", table });
        continue;
      }
      if (prodCols.length === 0) {
        console.log("⚠ missing in PROD");
        allDiffs.push({ kind: "table_missing_in_prod", table });
        continue;
      }

      const diffs = diffTable(table, devCols, prodCols);
      if (diffs.length === 0) {
        console.log(`✓ ${devCols.length} cols match`);
      } else {
        console.log(`✗ ${diffs.length} drift(s)`);
        allDiffs.push(...diffs);
      }
    } catch (err) {
      console.log(`✗ ${err.message}`);
      allDiffs.push({ kind: "fetch_error", table, error: String(err) });
    }
  }

  console.log();

  if (allDiffs.length === 0) {
    console.log("✅ No schema drift detected. All critical tables in sync.");
    process.exit(0);
  }

  console.log(`❌ Found ${allDiffs.length} schema drift(s):`);
  console.log();
  for (const d of allDiffs) {
    console.log(`  • [${d.kind}] ${d.table}${d.column ? "." + d.column : ""}`);
    if (d.detail) console.log(`    ${d.detail}`);
    if (d.error) console.log(`    ${d.error}`);
  }
  console.log();
  console.log("💡 To resolve: apply pending migrations to the lagging environment,");
  console.log("   then re-run this check. See supabase/migrations/ for the source.");
  process.exit(1);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(2);
});
