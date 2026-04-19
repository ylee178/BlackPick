/**
 * Shared env-loading + target-selection helper for DB-writing CLI
 * scripts. Fixes the 2026-04-19 incident where `sync-bc-*.ts` scripts
 * loaded `.env` directly (hand-rolled via `dotenv`), which pointed at
 * PROD, while the Next.js dev server loaded `.env.local` pointing at
 * DEV. Scripts silently wrote to a different database than the one
 * the developer expected from the app's behavior.
 *
 * Design per Codex 2026-04-19 canonical fix:
 *
 * 1. Use `@next/env::loadEnvConfig` so scripts respect Next.js's env
 *    precedence (`.env.local` overrides `.env`), matching the app.
 *
 * 2. Every mutating script MUST pass `--env=dev|prod` explicitly.
 *    Without the flag the script exits non-zero. No more implicit
 *    target selection.
 *
 * 3. `--env=prod` additionally requires `--confirm-prod`. PROD runs
 *    print the resolved Supabase ref + URL and wait for an
 *    interactive confirmation before any write.
 *
 * 4. The resolved URL + project ref are printed for every run, so the
 *    operator sees exactly which project is about to be touched.
 */

import { loadEnvConfig } from "@next/env";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// Loaded once per process. `@next/env` handles .env.local > .env
// precedence internally.
loadEnvConfig(process.cwd());

export type ScriptEnv = "dev" | "prod";

export type ResolvedScriptEnv = {
  env: ScriptEnv;
  supabaseUrl: string;
  supabaseRef: string;
  serviceRoleKey: string;
};

function parseEnvFlag(argv: readonly string[]): ScriptEnv | null {
  const flag = argv.find((arg) => arg.startsWith("--env="));
  if (!flag) return null;
  const value = flag.slice("--env=".length);
  if (value === "dev" || value === "prod") return value;
  return null;
}

function extractSupabaseRef(url: string): string {
  // https://<ref>.supabase.co → <ref>. Falls back to the full host if
  // the hostname doesn't match the canonical Supabase pattern.
  const match = url.match(/^https:\/\/([^.]+)\.supabase\.(co|io)/);
  return match?.[1] ?? new URL(url).host;
}

async function confirmProd(supabaseUrl: string, supabaseRef: string): Promise<void> {
  if (!process.argv.includes("--confirm-prod")) {
    console.error("");
    console.error("  Refusing to run against PROD without --confirm-prod.");
    console.error(`  Target: ${supabaseUrl} (ref: ${supabaseRef})`);
    console.error("");
    console.error("  If you truly intend to mutate PROD, re-run with:");
    console.error(`    --env=prod --confirm-prod`);
    console.error("");
    process.exit(4);
  }
  // Belt-and-suspenders: interactive confirmation when running in a
  // TTY. CI / pipe runs accept the --confirm-prod flag alone.
  if (input.isTTY && output.isTTY) {
    const rl = createInterface({ input, output });
    try {
      const answer = await rl.question(
        `\n  Type the Supabase ref '${supabaseRef}' to confirm PROD write: `,
      );
      if (answer.trim() !== supabaseRef) {
        console.error(`  Mismatch — expected '${supabaseRef}', got '${answer.trim()}'. Aborting.`);
        process.exit(4);
      }
    } finally {
      rl.close();
    }
  }
}

/**
 * Main entry point for scripts. Call at the top of `main()`. Exits
 * non-zero with an explanatory message if the env flag is missing or
 * the env/env-var combo doesn't resolve cleanly.
 */
export async function resolveScriptEnv(): Promise<ResolvedScriptEnv> {
  const env = parseEnvFlag(process.argv);
  if (!env) {
    console.error("");
    console.error("  Missing required flag: --env=dev|prod");
    console.error("");
    console.error("  DB-writing scripts require explicit target selection.");
    console.error("  Example:");
    console.error("    npx tsx src/scripts/sync-bc-fighter-ranks.ts --env=dev --apply");
    console.error("");
    console.error("  To run against PROD (destructive):");
    console.error("    npx tsx src/scripts/sync-bc-fighter-ranks.ts --env=prod --confirm-prod --apply");
    console.error("");
    process.exit(3);
  }

  // For dev we trust the Next.js precedence (`.env.local` wins). For
  // prod we require the operator to override via a separate file or
  // inline shell vars — the default .env.local has DEV credentials.
  // Operators running PROD deliberately set `NEXT_PUBLIC_SUPABASE_URL`
  // etc. in their shell or in a `.env.production.local` file they
  // source manually.
  //
  // We don't switch to a PROD-specific .env file automatically. That
  // was the 2026-04-19 incident class — file-based implicit target
  // selection. Explicit env vars in the invoking shell are the PROD
  // contract.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in resolved env.",
    );
    process.exit(2);
  }

  const supabaseRef = extractSupabaseRef(supabaseUrl);

  // Guard: catch the exact 2026-04-19 bug (env=dev but URL resolved to
  // a PROD-looking ref, or vice versa). The canonical DEV/PROD refs
  // are project constants declared in CURRENT_STATE.md; we soft-check
  // via the ref pattern + known DEV ref to flag obvious mismatches.
  const KNOWN_DEV_REF = "lqyzivuxznybmlnlexmq";
  const KNOWN_PROD_REF = "nxjwthpydynoecrvggih";
  if (env === "dev" && supabaseRef === KNOWN_PROD_REF) {
    console.error("");
    console.error(`  --env=dev selected, but resolved URL points at PROD (${supabaseRef}).`);
    console.error("  Check .env.local / shell overrides.");
    console.error("");
    process.exit(5);
  }
  if (env === "prod" && supabaseRef === KNOWN_DEV_REF) {
    console.error("");
    console.error(`  --env=prod selected, but resolved URL points at DEV (${supabaseRef}).`);
    console.error("  Set NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY to the PROD values");
    console.error("  in your shell before re-running.");
    console.error("");
    process.exit(5);
  }

  console.log(`🎯 Target: ${env.toUpperCase()} — ${supabaseUrl} (ref: ${supabaseRef})`);

  if (env === "prod") {
    await confirmProd(supabaseUrl, supabaseRef);
  }

  return { env, supabaseUrl, supabaseRef, serviceRoleKey };
}
