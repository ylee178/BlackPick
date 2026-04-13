#!/usr/bin/env node
/**
 * Post-deploy smoke test against the live production site.
 *
 * This is a thin safety net — it doesn't replace E2E or integration tests.
 * The goal is to catch obvious deploy breakage within seconds:
 *  - the homepage 5xx'd
 *  - the locale router stopped working
 *  - the login page is missing the social buttons
 *  - the OAuth callback route 404'd
 *  - the legal pages disappeared
 *
 * Each check is a single HTTP request with explicit expectations. Run via:
 *   node scripts/smoke-prod.mjs
 *   BASE_URL=https://staging.blackpick.io node scripts/smoke-prod.mjs
 */

const BASE = process.env.BASE_URL || "https://blackpick.io";

/** @typedef {{ name: string, fn: () => Promise<void> }} Check */

/** @type {Check[]} */
const checks = [];

function check(name, fn) {
  checks.push({ name, fn });
}

async function fetchOk(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "User-Agent": "blackpick-smoke/1.0" },
    ...opts,
  });
  return { url, status: res.status, headers: res.headers, body: await res.text() };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ───────────────────────────────────────────────────────────
// Checks
// ───────────────────────────────────────────────────────────

check("/  redirects to a locale", async () => {
  const r = await fetchOk("/");
  assert(
    r.status === 307 || r.status === 308 || r.status === 302,
    `expected 30x redirect, got ${r.status}`,
  );
});

check("/en  homepage renders 200", async () => {
  const r = await fetchOk("/en");
  assert(r.status === 200, `expected 200, got ${r.status}`);
  assert(r.body.length > 1000, `body suspiciously small (${r.body.length} chars)`);
});

check("/ko  homepage renders 200", async () => {
  const r = await fetchOk("/ko");
  assert(r.status === 200, `expected 200, got ${r.status}`);
});

check("/en/login  shows the Google social button", async () => {
  const r = await fetchOk("/en/login");
  assert(r.status === 200, `expected 200, got ${r.status}`);
  assert(
    r.body.includes("Continue with Google"),
    "login page missing 'Continue with Google' — auth UI may have regressed",
  );
  // Facebook is behind NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN=true. Once Meta
  // App Review is approved and the env var is flipped, uncomment the
  // assertion below to lock the button in as a smoke check.
  // assert(
  //   r.body.includes("Continue with Facebook"),
  //   "login page missing 'Continue with Facebook' — check the env flag",
  // );
});

check("/en/en  must NOT exist (regression for double-locale-prefix bug)", async () => {
  const r = await fetchOk("/en/en");
  assert(
    r.status === 404 || r.status === 307 || r.status === 308,
    `/en/en should be 404 or redirect, got ${r.status} — locale router may be double-prefixing`,
  );
});

check("/api/auth/callback  without code → redirect to /login with error", async () => {
  const r = await fetchOk("/api/auth/callback");
  assert(
    r.status >= 300 && r.status < 400,
    `expected redirect, got ${r.status}`,
  );
  const location = r.headers.get("location") || "";
  assert(
    location.includes("/login") && location.includes("error="),
    `expected redirect to /login?error=..., got ${location}`,
  );
});

check("/en/fighters  renders fighter list", async () => {
  const r = await fetchOk("/en/fighters");
  assert(r.status === 200, `expected 200, got ${r.status}`);
});

check("/en/privacy  legal page renders", async () => {
  const r = await fetchOk("/en/privacy");
  assert(r.status === 200, `expected 200, got ${r.status}`);
});

check("/en/terms  legal page renders", async () => {
  const r = await fetchOk("/en/terms");
  assert(r.status === 200, `expected 200, got ${r.status}`);
});

check("/robots.txt  served", async () => {
  const r = await fetchOk("/robots.txt");
  assert(r.status === 200, `expected 200, got ${r.status}`);
  assert(r.body.includes("User-Agent") || r.body.includes("User-agent"), "missing User-agent directive");
});

check("/opengraph-image  serves a real PNG (not a 307 to /en/...)", async () => {
  const r = await fetchOk("/opengraph-image");
  assert(r.status === 200, `expected 200, got ${r.status}`);
  const contentType = r.headers.get("content-type") || "";
  assert(
    contentType.startsWith("image/"),
    `expected image content-type, got ${contentType}`,
  );
  assert(r.body.length > 1000, `PNG suspiciously small (${r.body.length} bytes)`);
});

check("/apple-icon  serves a real PNG", async () => {
  const r = await fetchOk("/apple-icon");
  assert(r.status === 200, `expected 200, got ${r.status}`);
  const contentType = r.headers.get("content-type") || "";
  assert(
    contentType.startsWith("image/"),
    `expected image content-type, got ${contentType}`,
  );
});

// Email assets — Supabase auth email templates reference these absolute
// URLs via {{ .SiteURL }}/email/... . If any of them 404 or return
// non-image content the branded emails render with broken images in
// every user's inbox. Added 2026-04-13 with PR #25 email templates.

check("/email/bp-logo-email.png  BLACK PICK wordmark served", async () => {
  const r = await fetchOk("/email/bp-logo-email.png");
  assert(r.status === 200, `expected 200, got ${r.status}`);
  const contentType = r.headers.get("content-type") || "";
  assert(
    contentType.startsWith("image/"),
    `expected image content-type, got ${contentType}`,
  );
  assert(r.body.length > 1000, `logo PNG suspiciously small (${r.body.length} bytes)`);
});

check("/email/icon-shield  confirm-signup body icon renders 200", async () => {
  const r = await fetchOk("/email/icon-shield");
  assert(r.status === 200, `expected 200, got ${r.status}`);
  const contentType = r.headers.get("content-type") || "";
  assert(
    contentType.startsWith("image/"),
    `expected image content-type, got ${contentType}`,
  );
});

check("/email/icon-key  reset-password body icon renders 200", async () => {
  const r = await fetchOk("/email/icon-key");
  assert(r.status === 200, `expected 200, got ${r.status}`);
  const contentType = r.headers.get("content-type") || "";
  assert(
    contentType.startsWith("image/"),
    `expected image content-type, got ${contentType}`,
  );
});

check("/api/analytics/event  accepts POST + returns 204", async () => {
  const url = `${BASE}/api/analytics/event`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "blackpick-smoke/1.0" },
    body: JSON.stringify({
      event_type: "session_start",
      session_id: `smoke-${Date.now()}`,
      metadata: { referrer: "smoke_test" },
    }),
  });
  assert(res.status === 204, `expected 204, got ${res.status}`);
});

// ───────────────────────────────────────────────────────────
// Runner
// ───────────────────────────────────────────────────────────

async function main() {
  console.log(`🔥 BlackPick prod smoke test  →  ${BASE}`);
  console.log();

  const failures = [];
  for (const { name, fn } of checks) {
    try {
      await fn();
      console.log(`  ✓  ${name}`);
    } catch (err) {
      console.log(`  ✗  ${name}`);
      console.log(`     ${err.message}`);
      failures.push({ name, message: err.message });
    }
  }

  console.log();
  if (failures.length === 0) {
    console.log(`✅ ${checks.length}/${checks.length} smoke checks passed.`);
    process.exit(0);
  }

  console.log(`❌ ${failures.length}/${checks.length} smoke checks failed.`);
  console.log();
  console.log("Consider rolling back the latest deployment. Use:");
  console.log("  vercel rollback <previous-deployment-url>");
  process.exit(1);
}

main().catch((err) => {
  console.error("Smoke runner crashed:", err);
  process.exit(2);
});
