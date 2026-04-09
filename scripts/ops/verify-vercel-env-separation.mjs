#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

function findLinkedProjectCwd() {
  const explicit = process.env.VERCEL_LINKED_PROJECT_DIR;
  if (explicit && fs.existsSync(path.join(explicit, ".vercel", "project.json"))) {
    return explicit;
  }

  let current = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(current, ".vercel", "project.json"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new Error(
    "Missing .vercel/project.json. Run `npx vercel link` in this repo or set VERCEL_LINKED_PROJECT_DIR.",
  );
}

function pullVercelEnv(targetFile, linkedCwd, args) {
  execFileSync("npx", ["vercel", "env", "pull", targetFile, "--yes", "--cwd", linkedCwd, ...args], {
    stdio: "pipe",
    env: process.env,
  });
}

function parseEnvFile(filePath) {
  const env = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }

  return env;
}

function parseHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`OK ${message}`);
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "blackpick-vercel-env-"));
  const prodPath = path.join(tmpDir, "prod.env");
  const devPath = path.join(tmpDir, "dev.env");

  try {
    const linkedCwd = findLinkedProjectCwd();

    pullVercelEnv(prodPath, linkedCwd, ["--environment=production"]);
    pullVercelEnv(devPath, linkedCwd, ["--environment=preview", "--git-branch=develop"]);

    const prod = parseEnvFile(prodPath);
    const dev = parseEnvFile(devPath);

    const required = [
      "APP_ENV",
      "NEXT_PUBLIC_APP_ENV",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SITE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ];

    for (const key of required) {
      if (!prod[key]) fail(`production is missing ${key}`);
      else ok(`production has ${key}`);

      if (!dev[key]) fail(`preview(develop) is missing ${key}`);
      else ok(`preview(develop) has ${key}`);
    }

    if (dev.NEXT_PUBLIC_APP_ENV !== "development") {
      fail(
        `preview(develop) NEXT_PUBLIC_APP_ENV should be development, got ${dev.NEXT_PUBLIC_APP_ENV ?? "missing"}`,
      );
    } else {
      ok("preview(develop) NEXT_PUBLIC_APP_ENV is development");
    }

    if (dev.APP_ENV !== "development") {
      fail(`preview(develop) APP_ENV should be development, got ${dev.APP_ENV ?? "missing"}`);
    } else {
      ok("preview(develop) APP_ENV is development");
    }

    if (prod.NEXT_PUBLIC_APP_ENV !== "production") {
      fail(
        `production NEXT_PUBLIC_APP_ENV should be production, got ${prod.NEXT_PUBLIC_APP_ENV ?? "missing"}`,
      );
    } else {
      ok("production NEXT_PUBLIC_APP_ENV is production");
    }

    if (prod.APP_ENV !== "production") {
      fail(`production APP_ENV should be production, got ${prod.APP_ENV ?? "missing"}`);
    } else {
      ok("production APP_ENV is production");
    }

    if (dev.NEXT_PUBLIC_SUPABASE_URL === prod.NEXT_PUBLIC_SUPABASE_URL) {
      fail("preview(develop) and production use the same NEXT_PUBLIC_SUPABASE_URL");
    } else {
      ok(
        `Supabase URLs are separated (${parseHost(dev.NEXT_PUBLIC_SUPABASE_URL)} vs ${parseHost(prod.NEXT_PUBLIC_SUPABASE_URL)})`,
      );
    }

    if (dev.SUPABASE_SERVICE_ROLE_KEY === prod.SUPABASE_SERVICE_ROLE_KEY) {
      fail("preview(develop) and production use the same SUPABASE_SERVICE_ROLE_KEY");
    } else {
      ok("Supabase service role keys are separated");
    }

    if (dev.NEXT_PUBLIC_SITE_URL === prod.NEXT_PUBLIC_SITE_URL) {
      fail("preview(develop) and production use the same NEXT_PUBLIC_SITE_URL");
    } else {
      ok(`Site URLs are separated (${dev.NEXT_PUBLIC_SITE_URL} vs ${prod.NEXT_PUBLIC_SITE_URL})`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
