import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type Remap = {
  from_fighter: string;
  image_url: string;
  to_fighter: string;
};

export async function POST(req: NextRequest) {
  const { remaps } = (await req.json()) as { remaps: Remap[] };
  if (!remaps || remaps.length === 0) {
    return NextResponse.json({ error: "remaps required" }, { status: 400 });
  }

  const pixelDir = path.join(process.cwd(), "public/fighters/pixel");
  const results: string[] = [];

  for (const remap of remaps) {
    // Extract filename from URL
    const filename = remap.image_url.split("/").pop();
    if (!filename) continue;

    const srcPath = path.join(pixelDir, filename);
    if (!fs.existsSync(srcPath)) {
      results.push(`SKIP: ${filename} not found`);
      continue;
    }

    // Determine version suffix
    const versionMatch = filename.match(/_v\d+/);
    const version = versionMatch ? versionMatch[0] : "";

    // Move to new fighter ID
    const dstFilename = `${remap.to_fighter}${version}.png`;
    const dstPath = path.join(pixelDir, dstFilename);

    fs.renameSync(srcPath, dstPath);
    results.push(`OK: ${filename} -> ${dstFilename}`);
  }

  return NextResponse.json({ results });
}
