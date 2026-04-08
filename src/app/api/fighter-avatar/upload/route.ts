import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getUser } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const fighterId = formData.get("fighter_id") as string | null;

  if (!file || !fighterId) {
    return NextResponse.json({ error: "file and fighter_id required" }, { status: 400 });
  }

  // Validate fighter ID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(fighterId)) {
    return NextResponse.json({ error: "invalid fighter_id" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const pixelDir = path.join(process.cwd(), "public/fighters/pixel");
  if (!fs.existsSync(pixelDir)) fs.mkdirSync(pixelDir, { recursive: true });

  const filename = `${fighterId}.png`;
  const filepath = path.join(pixelDir, filename);
  fs.writeFileSync(filepath, buffer);

  return NextResponse.json({ path: `/fighters/pixel/${filename}` });
}
