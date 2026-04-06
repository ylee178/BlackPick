import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const REF_IMAGES = [
  "public/fighters/placeholders/red_hawk_v3.png",
  "public/fighters/placeholders/ko_gang_v3.png",
];

const PROMPT_STYLE =
  "These two pixel art portraits define the EXACT style to replicate. Notice: visible individual pixels, bold dark outlines, dramatic cel-shading with deep facial shadows, warm skin tones, dark gray background, and consistent face size filling ~70% of canvas height. Match this style precisely:";

const PROMPT_GENERATE = `Create a 90s arcade pixel art portrait of this fighter in the style of SNK Neo Geo games (King of Fighters, Metal Slug). Requirements:
1) LIKENESS — must be clearly recognizable as this specific person. Preserve exact facial features, skin tone, hairstyle, facial hair.
2) High-detail sprite with visible individual pixels, bold dark outlines, dramatic cel-shading with deep shadows.
3) FRAMING — face fills exactly 70% of canvas height (forehead to chin). Upper shoulders/trapezius at bottom. Front-facing, centered, square canvas.
4) Background: solid dark gray (#2A2A2A) — flat fill only.
5) Warm color palette. No purple or magenta tints on skin or lips. No text, no UI, no watermarks.`;

function getApiKey(): string {
  const envPath = path.join(process.cwd(), ".env");
  const content = fs.readFileSync(envPath, "utf8");
  const match = content.match(/GEMINI_API_KEY=(.+)/);
  if (!match) throw new Error("GEMINI_API_KEY not found");
  return match[1].trim();
}

function findSourcePhoto(fighterId: string): string | null {
  // 1. User-uploaded ref
  const refPath = path.join(process.cwd(), "Fighter_Images", "refs", `${fighterId}.png`);
  if (fs.existsSync(refPath)) return refPath;

  // 2. Manifest
  const manifestPath = path.join(process.cwd(), "Fighter_Images", "_manifest.json");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const entry = manifest.find((e: { db_id?: string }) => e.db_id === fighterId);
    if (entry) {
      const p = path.join(process.cwd(), "Fighter_Images", entry.filename);
      if (fs.existsSync(p)) return p;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const { fighter_id } = await req.json();
  if (!fighter_id) {
    return NextResponse.json({ error: "fighter_id required" }, { status: 400 });
  }

  const apiKey = getApiKey();
  const srcPath = findSourcePhoto(fighter_id);
  if (!srcPath) {
    return NextResponse.json({ error: "No source photo found" }, { status: 404 });
  }

  // Face crop
  const facePath = `/tmp/pixel_face_${fighter_id.substring(0, 8)}.png`;
  try {
    const r = execSync(`/tmp/face_crop "${srcPath}" "${facePath}" 0.7`, {
      encoding: "utf8",
      timeout: 10000,
    });
    if (!r.startsWith("OK")) throw new Error();
  } catch {
    fs.copyFileSync(srcPath, facePath);
  }

  // Build Gemini request
  const parts: Array<Record<string, unknown>> = [{ text: PROMPT_STYLE }];
  for (const rp of REF_IMAGES) {
    const fullPath = path.join(process.cwd(), rp);
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: fs.readFileSync(fullPath).toString("base64"),
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
  try { fs.unlinkSync(facePath); } catch {}

  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 500 });
  }

  for (const cand of data.candidates ?? []) {
    for (const part of cand.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const buf = Buffer.from(part.inlineData.data, "base64");
        const outPath = path.join(process.cwd(), "public/fighters/pixel", `${fighter_id}_v3.png`);
        fs.writeFileSync(outPath, buf);
        return NextResponse.json({ success: true, path: `/fighters/pixel/${fighter_id}_v3.png` });
      }
    }
  }

  return NextResponse.json({ error: "No image generated" }, { status: 500 });
}
