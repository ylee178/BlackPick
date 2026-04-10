import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const PROJECT_ROOT = process.cwd();
const IMPORT_NAME = "china-20260409";
const SOURCE_DIR = process.argv[2] || "/Users/uxersean/Desktop/china";

const REFS_DIR = path.join(PROJECT_ROOT, "Fighter_Images", "refs");
const PIXEL_DIR = path.join(PROJECT_ROOT, "public", "fighters", "pixel");
const IMPORT_MAP_PATH = path.join(PROJECT_ROOT, "src", "scripts", "import-maps", `${IMPORT_NAME}.json`);
const BACKUP_ROOT = path.join(PROJECT_ROOT, "Fighter_Images", "backups", IMPORT_NAME);
const REF_BACKUP_DIR = path.join(BACKUP_ROOT, "refs");
const PIXEL_BACKUP_DIR = path.join(BACKUP_ROOT, "pixel");

const PLACEHOLDER_PATHS = [
  path.join(PROJECT_ROOT, "public", "fighters", "placeholders", "red_hawk_v3.png"),
  path.join(PROJECT_ROOT, "public", "fighters", "placeholders", "ko_gang_v3.png"),
];

const FACE_CROP_BIN = "/tmp/face_crop";
const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_DELAY_MS = 2500;

const PROMPT_STYLE =
  "These two pixel art portraits define the EXACT style to replicate. Notice: visible individual pixels, bold dark outlines, dramatic cel-shading with deep facial shadows, warm skin tones, dark gray background, and consistent face size filling ~70% of canvas height. Match this style precisely:";

const PROMPT_GENERATE = `Create a 90s arcade pixel art portrait of this fighter in the style of SNK Neo Geo games (King of Fighters, Metal Slug). Requirements:
1) LIKENESS — must be clearly recognizable as this specific person. Preserve exact facial features, skin tone, hairstyle, facial hair.
2) High-detail sprite with visible individual pixels, bold dark outlines, dramatic cel-shading with deep shadows.
3) FRAMING — face fills exactly 70% of canvas height (forehead to chin). Upper shoulders/trapezius at bottom. Front-facing, centered, square canvas.
4) Background: solid dark gray (#2A2A2A) — flat fill only.
5) Warm color palette. No purple or magenta tints on skin or lips. No text, no UI, no watermarks.
6) The zoom level, color warmth, shadow depth, and pixel density must be identical to the two reference images.`;

function parseEnv(filepath) {
  const env = {};
  const raw = fs.readFileSync(filepath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const pivot = trimmed.indexOf("=");
    if (pivot === -1) continue;
    const key = trimmed.slice(0, pivot).trim();
    let value = trimmed.slice(pivot + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeKoreanKey(value) {
  return value.normalize("NFC").trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backupIfExists(sourcePath, backupDir, backupFilename) {
  if (!fs.existsSync(sourcePath)) return;
  ensureDir(backupDir);
  fs.copyFileSync(sourcePath, path.join(backupDir, backupFilename));
}

function findActualSourceFile(entry, filesByStem, filesByFullName) {
  const desiredStem = normalizeKoreanKey(entry.sourceName);
  const exactStemMatch = filesByStem.get(desiredStem);
  if (exactStemMatch) return exactStemMatch;

  const pngName = normalizeKoreanKey(`${entry.sourceName}.png`);
  return filesByFullName.get(pngName) ?? null;
}

function cropFaceOrFallback(sourcePath, fighterId) {
  const tempFacePath = `/tmp/pixel_face_${fighterId.slice(0, 8)}.png`;

  if (!fs.existsSync(FACE_CROP_BIN)) {
    return { facePath: sourcePath, cleanup: false };
  }

  try {
    const output = execSync(`"${FACE_CROP_BIN}" "${sourcePath}" "${tempFacePath}" 0.7`, {
      encoding: "utf8",
      timeout: 10000,
    });
    if (output.startsWith("OK")) {
      return { facePath: tempFacePath, cleanup: true };
    }
  } catch {}

  return { facePath: sourcePath, cleanup: false };
}

async function generatePixelPortrait(apiKey, sourcePath) {
  const parts = [{ text: PROMPT_STYLE }];

  for (const placeholderPath of PLACEHOLDER_PATHS) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: fs.readFileSync(placeholderPath).toString("base64"),
      },
    });
  }

  parts.push({ text: PROMPT_GENERATE });
  parts.push({
    inlineData: {
      mimeType: "image/png",
      data: fs.readFileSync(sourcePath).toString("base64"),
    },
  });

  const response = await fetch(`${API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }

  for (const candidate of data.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }
  }

  throw new Error("No image generated");
}

async function main() {
  const env = parseEnv(path.join(PROJECT_ROOT, ".env"));
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not found in .env");
  }

  const importMap = JSON.parse(fs.readFileSync(IMPORT_MAP_PATH, "utf8"));
  const sourceFiles = fs.readdirSync(SOURCE_DIR).filter((filename) => /\.(png|jpg|jpeg|webp)$/i.test(filename));

  const filesByStem = new Map();
  const filesByFullName = new Map();
  for (const filename of sourceFiles) {
    const fullPath = path.join(SOURCE_DIR, filename);
    const stem = normalizeKoreanKey(path.parse(filename).name);
    const normalizedFilename = normalizeKoreanKey(filename);
    filesByStem.set(stem, fullPath);
    filesByFullName.set(normalizedFilename, fullPath);
  }

  ensureDir(REFS_DIR);
  ensureDir(PIXEL_DIR);

  const results = [];

  for (const [index, entry] of importMap.entries()) {
    const label = `${entry.ringName} / ${entry.name}`;
    console.log(`\\n[${index + 1}/${importMap.length}] ${label}`);

    const sourcePath = findActualSourceFile(entry, filesByStem, filesByFullName);
    if (!sourcePath) {
      throw new Error(`Source file not found for ${entry.sourceName}`);
    }

    const refPath = path.join(REFS_DIR, `${entry.fighterId}.png`);
    const pixelPath = path.join(PIXEL_DIR, `${entry.fighterId}.png`);

    backupIfExists(refPath, REF_BACKUP_DIR, `${entry.fighterId}.png`);
    backupIfExists(pixelPath, PIXEL_BACKUP_DIR, `${entry.fighterId}.png`);

    fs.copyFileSync(sourcePath, refPath);
    console.log(`  ref -> ${path.relative(PROJECT_ROOT, refPath)}`);

    const { facePath, cleanup } = cropFaceOrFallback(refPath, entry.fighterId);
    const pixelBuffer = await generatePixelPortrait(apiKey, facePath);
    fs.writeFileSync(pixelPath, pixelBuffer);
    if (cleanup) {
      try {
        fs.unlinkSync(facePath);
      } catch {}
    }

    console.log(`  pixel -> ${path.relative(PROJECT_ROOT, pixelPath)} (${Math.round(pixelBuffer.length / 1024)}KB)`);
    results.push({
      sourceName: entry.sourceName,
      fighterId: entry.fighterId,
      ringName: entry.ringName,
      name: entry.name,
      refPath: path.relative(PROJECT_ROOT, refPath),
      pixelPath: path.relative(PROJECT_ROOT, pixelPath),
    });

    if (index < importMap.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  const reportPath = path.join(BACKUP_ROOT, "results.json");
  ensureDir(BACKUP_ROOT);
  fs.writeFileSync(reportPath, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`\\nDone. Report: ${path.relative(PROJECT_ROOT, reportPath)}`);
}

main().catch((error) => {
  console.error(`\\nImport failed: ${error.message}`);
  process.exit(1);
});
