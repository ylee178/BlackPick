import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAdminApi } from "@/lib/admin-auth";
import { invalidatePixelFileCache, listFighterPixelFilenames } from "@/lib/pixel-files";

const UUID_PNG_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_v\d+)?\.png$/;

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdminApi();
  if (adminCheck.response) return adminCheck.response;

  const { urls } = (await req.json()) as { urls: string[] };
  if (!urls || urls.length === 0) {
    return NextResponse.json({ error: "urls required" }, { status: 400 });
  }

  const pixelDir = path.join(process.cwd(), "public/fighters/pixel");
  const results: string[] = [];
  const processedFighterIds = new Set<string>();

  for (const url of urls) {
    const filename = url.split("/").pop()?.split("?")[0];
    if (!filename || !UUID_PNG_RE.test(filename)) continue;

    const fighterId = filename.replace(/(_v\d+)?\.png$/, "");
    if (processedFighterIds.has(fighterId)) continue;
    processedFighterIds.add(fighterId);

    for (const variant of listFighterPixelFilenames(fighterId)) {
      const filepath = path.join(pixelDir, variant);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        results.push(`Deleted: ${variant}`);
      }
    }
  }

  invalidatePixelFileCache();
  return NextResponse.json({ results });
}
