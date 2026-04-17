import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { requireAdminApi } from "@/lib/admin-auth";
import { findFighterReferenceFile } from "@/lib/fighter-reference-files";
import { invalidatePixelFileCache } from "@/lib/pixel-files";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { removeBackgroundWithRemoveBg } from "@/lib/remove-bg";

const generateLimiter = createRateLimiter({ limit: 5, windowSeconds: 3600 }); // 5 per hour

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const FIGHTER_IMAGE_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "Fighter_Images");
const PLACEHOLDER_DIR = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  "public",
  "fighters",
  "placeholders",
);
const PIXEL_OUTPUT_DIR = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  "public",
  "fighters",
  "pixel",
);

const REF_IMAGES = [
  "red_hawk_v3.png",
  "ko_gang_v3.png",
];

const PROMPT_STYLE =
  "These two pixel art portraits define the EXACT style to replicate. Notice: visible individual pixels, bold dark outlines, dramatic cel-shading with deep facial shadows, warm skin tones, dark gray background, and consistent face size filling ~70% of canvas height. Match this style precisely:";

const PROMPT_GENERATE = `Create a 90s arcade pixel art portrait of this fighter in the style of SNK Neo Geo games (King of Fighters, Metal Slug). Requirements:
1) LIKENESS — must be clearly recognizable as this specific person. Preserve exact facial features, skin tone, hairstyle, facial hair.
2) High-detail sprite with visible individual pixels, bold dark outlines, dramatic cel-shading with deep shadows.
3) FRAMING — face fills exactly 70% of canvas height (forehead to chin). Upper shoulders/trapezius at bottom. Front-facing, centered, square canvas.
4) Background: solid dark gray (#2A2A2A) — flat fill only. Keep the background clean and clearly separable from the fighter silhouette because a background-removal post-process will run after generation.
5) Warm color palette. No purple or magenta tints on skin or lips. No text, no UI, no watermarks.`;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not found");
  return key;
}

function findSourcePhoto(fighterId: string): string | null {
  // 1. User-uploaded ref
  const referenceFile = findFighterReferenceFile(fighterId);
  if (referenceFile) return referenceFile.filepath;

  // 2. Manifest
  const manifestPath = path.join(FIGHTER_IMAGE_DIR, "_manifest.json");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const entry = manifest.find((e: { db_id?: string }) => e.db_id === fighterId);
    if (entry) {
      const p = path.normalize(path.join(FIGHTER_IMAGE_DIR, entry.filename));
      // Block directory traversal from manifest filenames
      if (!p.startsWith(FIGHTER_IMAGE_DIR + path.sep)) return null;
      if (fs.existsSync(p)) return p;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdminApi();
  if (adminCheck.response) return adminCheck.response;
  const user = adminCheck.user;

  const { allowed, resetInSeconds } = generateLimiter.check(user.id);
  if (!allowed) return rateLimitResponse(resetInSeconds);

  const { fighter_id } = await req.json();
  if (
    !fighter_id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(fighter_id)
  ) {
    return NextResponse.json({ error: "valid fighter_id required" }, { status: 400 });
  }

  const apiKey = getApiKey();
  const srcPath = findSourcePhoto(fighter_id);
  if (!srcPath) {
    return NextResponse.json({ error: "No source photo found" }, { status: 404 });
  }

  // Face crop — temp file lives for the duration of this request. Wrap the
  // rest of the function in try/finally so the temp file is always cleaned
  // up even if Gemini / remove.bg / the write step throws.
  const facePath = `/tmp/pixel_face_${fighter_id.substring(0, 8)}.png`;
  try {
    const r = execFileSync("/tmp/face_crop", [srcPath, facePath, "0.7"], {
      encoding: "utf8",
      timeout: 10000,
    });
    if (!r.startsWith("OK")) throw new Error();
  } catch {
    fs.copyFileSync(srcPath, facePath);
  }

  try {
    // Build Gemini request
    const parts: Array<Record<string, unknown>> = [{ text: PROMPT_STYLE }];
    for (const rp of REF_IMAGES) {
      const fullPath = path.join(PLACEHOLDER_DIR, rp);
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
    let data: { error?: { message?: string }; candidates?: unknown[] };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      });
      data = await res.json();
    } catch (err) {
      console.error("Gemini request failed", err);
      return NextResponse.json(
        { error: "Image generation service unavailable" },
        { status: 502 },
      );
    }

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    for (const cand of (data.candidates ?? []) as Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string } }> };
    }>) {
      for (const part of cand.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const rawBuffer = Buffer.from(part.inlineData.data, "base64");
          let buf: Buffer;
          try {
            buf = await removeBackgroundWithRemoveBg(rawBuffer, `${fighter_id}_v3.png`);
          } catch (err) {
            console.error("remove.bg failed, falling back to raw Gemini output", err);
            // Graceful fallback: if remove.bg is down or rate-limited, ship
            // the flat-background version rather than blocking generation.
            buf = rawBuffer;
          }
          const outPath = path.join(PIXEL_OUTPUT_DIR, `${fighter_id}_v3.png`);
          fs.writeFileSync(outPath, buf);
          invalidatePixelFileCache();
          return NextResponse.json({
            success: true,
            path: `/fighters/pixel/${fighter_id}_v3.png`,
          });
        }
      }
    }

    return NextResponse.json({ error: "No image generated" }, { status: 500 });
  } finally {
    try {
      fs.unlinkSync(facePath);
    } catch {
      // Temp file already gone — fine.
    }
  }
}
