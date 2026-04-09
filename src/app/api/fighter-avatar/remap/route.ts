import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAdminApi } from "@/lib/admin-auth";
import { invalidatePixelFileCache } from "@/lib/pixel-files";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UUID_PNG_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_v\d+)?\.png$/;

type Remap = {
  from_fighter: string;
  image_url: string;
  to_fighter: string;
};

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdminApi();
  if (adminCheck.response) return adminCheck.response;

  const { remaps } = (await req.json()) as { remaps: Remap[] };
  if (!remaps || remaps.length === 0) {
    return NextResponse.json({ error: "remaps required" }, { status: 400 });
  }

  const pixelDir = path.join(process.cwd(), "public/fighters/pixel");
  const results: string[] = [];

  for (const remap of remaps) {
    const filename = remap.image_url.split("/").pop();
    if (!filename || !UUID_PNG_RE.test(filename)) continue;

    if (!UUID_RE.test(remap.to_fighter)) {
      results.push(`SKIP: invalid to_fighter ID`);
      continue;
    }

    const srcPath = path.join(pixelDir, filename);
    if (!fs.existsSync(srcPath)) {
      results.push(`SKIP: ${filename} not found`);
      continue;
    }

    const versionMatch = filename.match(/_v\d+/);
    const version = versionMatch ? versionMatch[0] : "";

    const dstFilename = `${remap.to_fighter}${version}.png`;
    const dstPath = path.join(pixelDir, dstFilename);

    fs.renameSync(srcPath, dstPath);
    results.push(`OK: ${filename} -> ${dstFilename}`);
  }

  invalidatePixelFileCache();
  return NextResponse.json({ results });
}
