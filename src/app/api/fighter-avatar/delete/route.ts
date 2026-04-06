import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const { urls } = (await req.json()) as { urls: string[] };
  if (!urls || urls.length === 0) {
    return NextResponse.json({ error: "urls required" }, { status: 400 });
  }

  const pixelDir = path.join(process.cwd(), "public/fighters/pixel");
  const results: string[] = [];

  for (const url of urls) {
    const filename = url.split("/").pop();
    if (!filename) continue;
    const filepath = path.join(pixelDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      results.push(`Deleted: ${filename}`);
    }
  }

  return NextResponse.json({ results });
}
