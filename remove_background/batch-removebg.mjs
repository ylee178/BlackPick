#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "Fighter_Images");
const MANIFEST_PATH = path.join(SOURCE_DIR, "_manifest.json");
const WORK_DIR = path.join(ROOT, "remove_background");
const LOGS_DIR = path.join(WORK_DIR, "logs");
const REMOVE_BG_ENDPOINT = "https://api.remove.bg/v1.0/removebg";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;

function getFlagValue(flag, fallback = null) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readEnvValue(filePath, key) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = content.match(new RegExp(`^${escapedKey}=(.+)$`, "m"));
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

async function getRemoveBgApiKey() {
  const envKey = process.env.REMOVE_BG_API_KEY?.trim();
  if (envKey) return envKey;

  const envPaths = [
    path.join(ROOT, ".env.local"),
    path.join(ROOT, ".env"),
  ];

  for (const envPath of envPaths) {
    const fileKey = await readEnvValue(envPath, "REMOVE_BG_API_KEY");
    if (fileKey) return fileKey;
  }

  return null;
}

async function ensureDirs() {
  await fs.mkdir(LOGS_DIR, { recursive: true });
}

function getInputDir() {
  const subdir = getFlagValue("--input-subdir", "mapped-originals");
  return path.join(WORK_DIR, "input", subdir);
}

function getOutputDir() {
  const subdir = getFlagValue("--output-subdir", "removebg");
  return path.join(WORK_DIR, "output", subdir);
}

async function readManifest() {
  const raw = await fs.readFile(MANIFEST_PATH, "utf8");
  const manifest = JSON.parse(raw);

  return manifest
    .map((entry) => ({
      filename: entry.filename,
      dbId: entry.db_id ?? null,
      ringName: entry.ring_name ?? null,
      sourcePath: path.join(SOURCE_DIR, entry.filename),
    }))
    .filter((entry) => entry.filename);
}

function outputNameFor(filename) {
  const parsed = path.parse(filename);
  return `${parsed.name}.png`;
}

async function prepareInputs() {
  await ensureDirs();
  const inputDir = getInputDir();
  await fs.mkdir(inputDir, { recursive: true });
  const manifestEntries = await readManifest();

  const copied = [];
  const missing = [];
  const seen = new Set();

  for (const entry of manifestEntries) {
    if (seen.has(entry.filename)) continue;
    seen.add(entry.filename);

    try {
      await fs.access(entry.sourcePath);
    } catch {
      missing.push(entry);
      continue;
    }

    const destinationPath = path.join(inputDir, entry.filename);
    await fs.copyFile(entry.sourcePath, destinationPath);
    copied.push({
      filename: entry.filename,
      dbId: entry.dbId,
      ringName: entry.ringName,
      destinationPath,
    });
  }

  const summary = {
    preparedAt: new Date().toISOString(),
    copiedCount: copied.length,
    missingCount: missing.length,
    copied,
    missing,
  };

  const summaryPath = path.join(LOGS_DIR, "prepare-summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`Prepared ${copied.length} mapped images into ${inputDir}`);
  if (missing.length > 0) {
    console.log(`Missing ${missing.length} files. See ${summaryPath}`);
  }
}

async function prepareDirectoryInputs() {
  await ensureDirs();
  const sourceDirFlag = getFlagValue("--source-dir");
  if (!sourceDirFlag) {
    console.error("Missing --source-dir");
    process.exitCode = 1;
    return;
  }

  const sourceDir = path.isAbsolute(sourceDirFlag)
    ? sourceDirFlag
    : path.join(ROOT, sourceDirFlag);
  const inputDir = getInputDir();
  await fs.mkdir(inputDir, { recursive: true });

  const limitValue = getFlagValue("--limit");
  const limit = limitValue ? Number(limitValue) : null;

  const files = (await fs.readdir(sourceDir))
    .filter((name) => !name.startsWith("."))
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const selected = Number.isFinite(limit) && limit > 0 ? files.slice(0, limit) : files;
  const copied = [];

  for (const filename of selected) {
    const sourcePath = path.join(sourceDir, filename);
    const destinationPath = path.join(inputDir, filename);
    await fs.copyFile(sourcePath, destinationPath);
    copied.push({
      filename,
      sourcePath,
      destinationPath,
    });
  }

  const summary = {
    preparedAt: new Date().toISOString(),
    sourceDir,
    copiedCount: copied.length,
    copied,
  };

  const summaryPath = path.join(LOGS_DIR, `prepare-${path.basename(inputDir)}.json`);
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`Prepared ${copied.length} images from ${sourceDir} into ${inputDir}`);
  console.log(`Summary written to ${summaryPath}`);
}

async function listPreparedInputs() {
  await ensureDirs();
  const inputDir = getInputDir();
  const outputDir = getOutputDir();
  await fs.mkdir(inputDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  const files = await fs.readdir(inputDir);
  return files
    .filter((name) => !name.startsWith("."))
    .sort((a, b) => a.localeCompare(b))
    .map((filename) => ({
      filename,
      inputPath: path.join(inputDir, filename),
      outputPath: path.join(outputDir, outputNameFor(filename)),
    }));
}

async function removeBackground(inputPath, outputPath, apiKey) {
  const buffer = await fs.readFile(inputPath);
  const filename = path.basename(inputPath);

  const form = new FormData();
  form.append(
    "image_file",
    new File([buffer], filename, {
      type: "application/octet-stream",
    }),
  );
  form.append("size", "auto");
  form.append("format", "png");

  const response = await fetch(REMOVE_BG_ENDPOINT, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `remove.bg failed with ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
}

async function processInputs() {
  await ensureDirs();
  const inputDir = getInputDir();

  const apiKey = await getRemoveBgApiKey();
  if (!apiKey) {
    console.error("Missing REMOVE_BG_API_KEY in environment, .env.local, or .env");
    process.exitCode = 1;
    return;
  }

  const prepared = await listPreparedInputs();
  if (prepared.length === 0) {
    console.error(`No prepared inputs found in ${inputDir}`);
    console.error("Run a prepare command first.");
    process.exitCode = 1;
    return;
  }

  const overwrite = hasFlag("--overwrite");
  const limitValue = getFlagValue("--limit");
  const limit = limitValue ? Number(limitValue) : null;
  const items = Number.isFinite(limit) && limit > 0 ? prepared.slice(0, limit) : prepared;

  const results = [];
  let creditsExhausted = false;

  for (const [index, item] of items.entries()) {
    if (creditsExhausted) {
      results.push({
        filename: item.filename,
        status: "aborted_insufficient_credits",
      });
      continue;
    }

    const relativeOutput = path.relative(ROOT, item.outputPath);

    if (!overwrite) {
      try {
        await fs.access(item.outputPath);
        results.push({
          filename: item.filename,
          status: "skipped_existing",
          output: relativeOutput,
        });
        console.log(`[${index + 1}/${items.length}] skip ${item.filename}`);
        continue;
      } catch {
        // continue
      }
    }

    console.log(`[${index + 1}/${items.length}] remove.bg ${item.filename}`);

    let attempt = 0;
    let lastError = null;

    while (attempt < MAX_RETRIES) {
      attempt += 1;

      try {
        await removeBackground(item.inputPath, item.outputPath, apiKey);
        results.push({
          filename: item.filename,
          status: "success",
          output: relativeOutput,
          attempts: attempt,
        });
        lastError = null;
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastError = message;

        if (message.includes("insufficient_credits")) {
          creditsExhausted = true;
          break;
        }

        if (message.includes("rate_limit_exceeded") && attempt < MAX_RETRIES) {
          console.log(`    rate limited, retrying in ${RETRY_DELAY_MS / 1000}s...`);
          await sleep(RETRY_DELAY_MS);
          continue;
        }

        break;
      }
    }

    if (lastError) {
      results.push({
        filename: item.filename,
        status: creditsExhausted ? "error_insufficient_credits" : "error",
        error: lastError,
        attempts: attempt,
      });
    }
  }

  const summary = {
    processedAt: new Date().toISOString(),
    total: items.length,
    success: results.filter((item) => item.status === "success").length,
    skippedExisting: results.filter((item) => item.status === "skipped_existing").length,
    error: results.filter((item) => item.status === "error").length,
    insufficientCredits: results.filter((item) => item.status === "error_insufficient_credits").length,
    abortedInsufficientCredits: results.filter((item) => item.status === "aborted_insufficient_credits").length,
    results,
  };

  const stamp = new Date().toISOString().replaceAll(":", "-");
  const summaryPath = path.join(LOGS_DIR, `removebg-summary-${stamp}.json`);
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Summary written to ${summaryPath}`);
}

async function main() {
  const command = process.argv[2];

  if (command === "prepare") {
    await prepareInputs();
    return;
  }

  if (command === "prepare-dir") {
    await prepareDirectoryInputs();
    return;
  }

  if (command === "process") {
    await processInputs();
    return;
  }

  console.log("Usage:");
  console.log("  node remove_background/batch-removebg.mjs prepare");
  console.log("  node remove_background/batch-removebg.mjs prepare-dir --source-dir public/fighters/pixel --input-subdir pixel-sample-originals --limit 5");
  console.log("  node remove_background/batch-removebg.mjs process [--input-subdir NAME] [--output-subdir NAME] [--limit N] [--overwrite]");
}

await main();
