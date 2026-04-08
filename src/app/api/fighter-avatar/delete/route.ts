import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getUser } from "@/lib/supabase-server";

const UUID_PNG_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_v\d+)?\.png$/;

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { urls } = (await req.json()) as { urls: string[] };
  if (!urls || urls.length === 0) {
    return NextResponse.json({ error: "urls required" }, { status: 400 });
  }

  const pixelDir = path.join(process.cwd(), "public/fighters/pixel");
  const results: string[] = [];

  for (const url of urls) {
    const filename = url.split("/").pop();
    if (!filename || !UUID_PNG_RE.test(filename)) continue;
    const filepath = path.join(pixelDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      results.push(`Deleted: ${filename}`);
    }
  }

  return NextResponse.json({ results });
}
