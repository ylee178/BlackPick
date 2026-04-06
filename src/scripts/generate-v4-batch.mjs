import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const API_KEY = process.env.GEMINI_API_KEY;

const PROJECT = process.cwd();
const PIXEL_DIR = path.join(PROJECT, "public/fighters/pixel");
const REFS_DIR = path.join(PROJECT, "Fighter_Images/refs");

const REF_IMAGES = [
  path.join(PROJECT, "public/fighters/placeholders/red_hawk_v3.png"),
  path.join(PROJECT, "public/fighters/placeholders/ko_gang_v3.png"),
];

const PROMPT_STYLE =
  "These two pixel art portraits define the EXACT style to replicate. Notice: visible individual pixels, bold dark outlines, dramatic cel-shading with deep facial shadows, warm skin tones, dark gray background, and consistent face size filling ~70% of canvas height. Match this style precisely:";

const PROMPT_GENERATE = `Create a 90s arcade pixel art portrait of this fighter in the style of SNK Neo Geo games (King of Fighters, Metal Slug). Requirements:
1) LIKENESS — must be clearly recognizable as this specific person. Preserve exact facial features, skin tone, hairstyle, facial hair.
2) High-detail sprite with visible individual pixels, bold dark outlines, dramatic cel-shading with deep shadows.
3) FRAMING — face fills exactly 70% of canvas height (forehead to chin). Upper shoulders/trapezius at bottom. Front-facing, centered, square canvas.
4) Background: solid dark gray (#2A2A2A) — flat fill only.
5) Warm color palette. No purple or magenta tints on skin or lips. No text, no UI, no watermarks.
6) The zoom level, color warmth, shadow depth, and pixel density must be identical to the two reference images.`;

const FIGHTERS = [
  { id: "8d87ff9e-4aa5-4276-8e7b-2e42cc6eb38f", name: "미스터초크" },
  { id: "30387b8c-1170-44b1-a144-fe77bbfcb568", name: "투신" },
  { id: "10ebbcf1-fbaa-4ff2-9997-08065b42f4f3", name: "아레스" },
  { id: "3f063022-6b45-4fea-ac61-d7befca35eed", name: "탱크" },
  { id: "7a67f6a9-d3fe-43d7-88f7-223f86ff138b", name: "인디언킹" },
  { id: "639d0b8f-f01b-45f2-8da3-61e4890b9027", name: "우마왕" },
  { id: "658ba935-e167-4987-b273-346b548c236d", name: "붉은매" },
  { id: "906b6651-7364-4c3a-8ee7-5df9a353f959", name: "프리즌" },
  { id: "cad357b5-0217-43af-bb77-3b80e0fed51b", name: "히로시마" },
];

async function generate(fighter) {
  const srcPath = path.join(REFS_DIR, `${fighter.id}.png`);
  if (!fs.existsSync(srcPath)) {
    console.log(`  SKIP: no ref photo`);
    return false;
  }

  // Face crop
  let facePath = `/tmp/pixel_face_${fighter.id.substring(0, 8)}.png`;
  try {
    const r = execSync(`/tmp/face_crop "${srcPath}" "${facePath}" 0.7`, {
      encoding: "utf8",
      timeout: 10000,
    });
    if (!r.startsWith("OK")) throw new Error();
  } catch {
    facePath = srcPath;
  }

  // Build request
  const parts = [{ text: PROMPT_STYLE }];
  for (const rp of REF_IMAGES) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: fs.readFileSync(rp).toString("base64"),
      },
    });
  }
  parts.push({ text: PROMPT_GENERATE });
  parts.push({
    inlineData: {
      mimeType: "image/png",
      data: fs.readFileSync(facePath).toString("base64"),
    },
  });

  const url = `${API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  const data = await res.json();
  try { if (facePath !== srcPath) fs.unlinkSync(facePath); } catch {}

  if (data.error) {
    console.log(`  ERROR: ${data.error.message}`);
    return false;
  }

  for (const cand of data.candidates ?? []) {
    for (const part of cand.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const buf = Buffer.from(part.inlineData.data, "base64");
        const outPath = path.join(PIXEL_DIR, `${fighter.id}_v4.png`);
        fs.writeFileSync(outPath, buf);
        const kb = Math.round(buf.length / 1024);
        console.log(`  OK: ${kb}KB`);
        return true;
      }
    }
  }

  console.log(`  ERROR: No image in response`);
  return false;
}

async function main() {
  let success = 0;
  let failed = 0;

  for (const f of FIGHTERS) {
    console.log(`Generating: ${f.name}`);
    const ok = await generate(f);
    if (ok) success++;
    else failed++;
    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\nDone! Success: ${success} Failed: ${failed}`);
}

main();
