/**
 * Generate pixel art avatars for all fighters
 *
 * Pipeline: Fighter photo → Face crop (Swift Vision) → Gemini pixel art → Save
 *
 * Usage:
 *   npx tsx src/scripts/generate-pixel-avatars.ts
 *
 * Requires:
 *   - GEMINI_API_KEY in .env
 *   - /tmp/face_crop binary (built from Swift)
 *   - Fighter_Images/ with downloaded photos
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const FIGHTER_IMAGES_DIR = path.resolve(process.cwd(), "Fighter_Images");
const OUTPUT_DIR = path.resolve(process.cwd(), "public/fighters/pixel");
const MANIFEST_PATH = path.join(FIGHTER_IMAGES_DIR, "_manifest.json");
const FACE_CROP_BIN = "/tmp/face_crop";

const REF_DIR = "/Users/uxersean/Desktop/raw_fighters/generated";
const REF_IMAGES = ["trg.png", "ppakse.png"];

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DELAY_MS = 3000; // rate limit buffer

const PROMPT_STYLE = `These two reference images define the EXACT pixel art style. Study them carefully — match the pixel density, color palette warmth, shading technique, and line weight precisely:`;
const PROMPT_GENERATE = `Transform this fighter photo into the EXACT same pixel art style as the references. Critical requirements:
1) LIKENESS IS #1 PRIORITY — the pixel art must be clearly recognizable as this specific person. Preserve their exact facial structure, eye shape, nose, jawline, skin tone, and hairstyle.
2) Neo Geo / King of Fighters arcade sprite aesthetic — same pixel size and shading as references.
3) Framing: head to trapezius muscles (upper shoulders visible), front-facing, centered on square canvas.
4) Background: solid dark gray (#2A2A2A) — NOT transparent, NOT checkerboard, just flat dark gray fill.
5) Consistent warm color palette matching the reference images — avoid cold/blue tones.
6) Preserve the lighting and shadows from the original photo — add realistic shading and depth to the pixel art, not flat colors.
7) No text, no UI elements, no watermarks.`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ManifestEntry = {
  source_id: string;
  db_id: string;
  ring_name: string | null;
  name: string | null;
  filename: string;
};

function loadEnvKey(): string {
  const envPath = path.resolve(process.cwd(), ".env");
  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/GEMINI_API_KEY=(.+)/);
  if (!match) throw new Error("GEMINI_API_KEY not found in .env");
  return match[1].trim();
}

function faceCrop(inputPath: string, outputPath: string): boolean {
  try {
    const result = execSync(`"${FACE_CROP_BIN}" "${inputPath}" "${outputPath}" 0.7`, {
      encoding: "utf8",
      timeout: 10000,
    });
    return result.startsWith("OK");
  } catch {
    return false;
  }
}

async function generatePixelArt(
  apiKey: string,
  facePath: string,
  refPaths: string[],
): Promise<Buffer | null> {
  const faceB64 = fs.readFileSync(facePath).toString("base64");

  const parts: Array<Record<string, unknown>> = [
    { text: PROMPT_STYLE },
  ];

  for (const refPath of refPaths) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: fs.readFileSync(refPath).toString("base64"),
      },
    });
  }

  parts.push({ text: PROMPT_GENERATE });
  parts.push({
    inlineData: {
      mimeType: "image/png",
      data: faceB64,
    },
  });

  const url = `${API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  const data = await res.json();

  if (data.error) {
    console.error(`    API error: ${data.error.message}`);
    return null;
  }

  for (const cand of data.candidates ?? []) {
    for (const part of cand.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }
  }

  return null;
}

async function main() {
  const apiKey = loadEnvKey();

  // Ensure output dir
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Verify face_crop binary
  if (!fs.existsSync(FACE_CROP_BIN)) {
    console.error("face_crop binary not found at /tmp/face_crop. Build it first.");
    process.exit(1);
  }

  // Load manifest
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  console.log(`\n📋 ${manifest.length} fighters in manifest\n`);

  // Reference images
  const refPaths = REF_IMAGES.map((f) => path.join(REF_DIR, f)).filter((f) => fs.existsSync(f));
  console.log(`🎨 ${refPaths.length} reference image(s)\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    const label = entry.ring_name || entry.name || entry.source_id;
    const outputFile = `${entry.db_id}.png`;
    const outputPath = path.join(OUTPUT_DIR, outputFile);

    // Skip if already generated
    if (fs.existsSync(outputPath)) {
      console.log(`  [${i + 1}/${manifest.length}] ${label} — already exists, skipping`);
      skipped++;
      continue;
    }

    console.log(`  [${i + 1}/${manifest.length}] ${label}`);

    // Find source image
    const srcPath = path.join(FIGHTER_IMAGES_DIR, entry.filename);
    if (!fs.existsSync(srcPath)) {
      console.log(`    ✗ Source image not found: ${entry.filename}`);
      failed++;
      continue;
    }

    // Face crop
    const facePath = `/tmp/pixel_face_${entry.source_id}.png`;
    if (!faceCrop(srcPath, facePath)) {
      console.log(`    ✗ Face detection failed`);
      failed++;
      continue;
    }

    // Generate pixel art
    const pixelData = await generatePixelArt(apiKey, facePath, refPaths);
    if (!pixelData) {
      console.log(`    ✗ Pixel art generation failed`);
      failed++;
      continue;
    }

    // Save
    fs.writeFileSync(outputPath, pixelData);
    console.log(`    ✓ ${outputFile} (${Math.round(pixelData.length / 1024)}KB)`);
    success++;

    // Cleanup temp face
    try { fs.unlinkSync(facePath); } catch {}

    // Rate limit
    if (i < manifest.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ Generated: ${success}`);
  console.log(`⏭  Skipped:   ${skipped}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log(`📁 Output:    ${OUTPUT_DIR}\n`);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
