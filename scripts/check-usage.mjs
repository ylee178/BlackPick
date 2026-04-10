#!/usr/bin/env node
/**
 * Supabase Free tier usage monitor.
 *
 * Queries PROD for:
 *  - total DB size (pg_database_size)
 *  - auth.users count (as a proxy for total users)
 *  - MAU in last 30 days (distinct user_id in user_events OR auth.users last_sign_in_at)
 *  - public.user_events row count (analytics volume)
 *
 * Compares against Supabase Free tier limits:
 *  - DB: 500 MB
 *  - MAU: 50,000
 *
 * Thresholds:
 *  - Green: < 70%
 *  - Yellow: 70-90% → planning-level warning
 *  - Red: > 90% → upgrade-now alert
 *
 * Exit codes:
 *  - 0: all green
 *  - 1: at least one yellow
 *  - 2: at least one red
 *  - 3: error (API failure, bad credentials, etc.)
 *
 * Intended to run weekly via GitHub Actions cron.
 */

const PAT = process.env.SUPABASE_ACCESS_TOKEN;
if (!PAT) {
  console.error("❌ SUPABASE_ACCESS_TOKEN env var not set");
  process.exit(3);
}

const PROD_REF = process.env.SUPABASE_PROD_REF || "nxjwthpydynoecrvggih";

// Supabase Free tier limits (as of 2026-04)
const FREE_DB_BYTES = 500 * 1024 * 1024; // 500 MB
const FREE_MAU = 50_000;

const THRESHOLDS = {
  yellow: 0.7,
  red: 0.9,
};

const UA = "blackpick-cli/1.0 (usage-monitor)";

async function queryProd(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROD_REF}/database/query`,
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
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function statusFor(ratio) {
  if (ratio >= THRESHOLDS.red) return { symbol: "🔴", label: "RED", level: 2 };
  if (ratio >= THRESHOLDS.yellow) return { symbol: "🟡", label: "YELLOW", level: 1 };
  return { symbol: "🟢", label: "GREEN", level: 0 };
}

async function main() {
  console.log("📊 BlackPick Supabase Free tier usage check");
  console.log(`   Project: ${PROD_REF}`);
  console.log();

  let worstLevel = 0;
  const findings = [];

  // 1. Database size
  try {
    const [{ size_bytes }] = await queryProd(
      "SELECT pg_database_size(current_database()) AS size_bytes",
    );
    const ratio = size_bytes / FREE_DB_BYTES;
    const s = statusFor(ratio);
    findings.push({
      metric: "Database size",
      value: formatBytes(size_bytes),
      limit: formatBytes(FREE_DB_BYTES),
      percent: (ratio * 100).toFixed(1) + "%",
      status: s,
    });
    worstLevel = Math.max(worstLevel, s.level);
  } catch (err) {
    findings.push({
      metric: "Database size",
      value: "ERROR",
      limit: formatBytes(FREE_DB_BYTES),
      percent: "—",
      status: { symbol: "❌", label: "ERROR", level: 3 },
      error: String(err),
    });
    worstLevel = 3;
  }

  // 2. Total auth users
  try {
    const [{ total_users }] = await queryProd(
      "SELECT COUNT(*)::int AS total_users FROM auth.users",
    );
    findings.push({
      metric: "Total auth users",
      value: String(total_users),
      limit: "(no limit, see MAU)",
      percent: "—",
      status: { symbol: "ℹ️", label: "INFO", level: 0 },
    });
  } catch (err) {
    findings.push({
      metric: "Total auth users",
      value: "ERROR",
      limit: "—",
      percent: "—",
      status: { symbol: "❌", label: "ERROR", level: 3 },
      error: String(err),
    });
    worstLevel = 3;
  }

  // 3. MAU (last 30 days)
  try {
    const [{ mau }] = await queryProd(
      "SELECT COUNT(DISTINCT id)::int AS mau FROM auth.users WHERE last_sign_in_at >= NOW() - INTERVAL '30 days'",
    );
    const ratio = mau / FREE_MAU;
    const s = statusFor(ratio);
    findings.push({
      metric: "MAU (30d)",
      value: String(mau),
      limit: String(FREE_MAU),
      percent: (ratio * 100).toFixed(2) + "%",
      status: s,
    });
    worstLevel = Math.max(worstLevel, s.level);
  } catch (err) {
    findings.push({
      metric: "MAU (30d)",
      value: "ERROR",
      limit: String(FREE_MAU),
      percent: "—",
      status: { symbol: "❌", label: "ERROR", level: 3 },
      error: String(err),
    });
    worstLevel = 3;
  }

  // 4. Analytics volume
  try {
    const [{ total_events }] = await queryProd(
      "SELECT COUNT(*)::int AS total_events FROM public.user_events",
    );
    findings.push({
      metric: "user_events rows",
      value: String(total_events),
      limit: "(counts against DB size)",
      percent: "—",
      status: { symbol: "ℹ️", label: "INFO", level: 0 },
    });
  } catch (err) {
    findings.push({
      metric: "user_events rows",
      value: "ERROR",
      limit: "—",
      percent: "—",
      status: { symbol: "❌", label: "ERROR", level: 3 },
      error: String(err),
    });
    worstLevel = 3;
  }

  // Print table
  for (const f of findings) {
    console.log(
      `  ${f.status.symbol}  ${f.metric.padEnd(22)} ${f.value.padStart(14)}  /  ${f.limit.padEnd(20)}  ${f.percent.padStart(8)}  ${f.status.label}`,
    );
    if (f.error) console.log(`       ${f.error}`);
  }
  console.log();

  if (worstLevel === 0) {
    console.log("✅ All metrics in green zone. No action needed.");
    process.exit(0);
  } else if (worstLevel === 1) {
    console.log("🟡 At least one metric is in yellow zone. Plan the Pro upgrade.");
    console.log("   Free tier limits: DB 500 MB, MAU 50K. Pro ($25/mo): DB 8 GB, MAU 100K.");
    process.exit(1);
  } else if (worstLevel === 2) {
    console.log("🔴 At least one metric is in red zone. UPGRADE NOW.");
    console.log("   Risk of hitting hard limit → reads/writes may be throttled or rejected.");
    process.exit(2);
  } else {
    console.log("❌ Error querying Supabase. Check SUPABASE_ACCESS_TOKEN and project ref.");
    process.exit(3);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(3);
});
