import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const fighterId = formData.get("fighter_id") as string | null;

  if (!file || !fighterId) {
    return NextResponse.json({ error: "file and fighter_id required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const refDir = path.join(process.cwd(), "Fighter_Images", "refs");
  if (!fs.existsSync(refDir)) fs.mkdirSync(refDir, { recursive: true });

  const filename = `${fighterId}.png`;
  const filepath = path.join(refDir, filename);
  fs.writeFileSync(filepath, buffer);

  return NextResponse.json({ path: `/api/fighter-avatar/ref/${fighterId}` });
}
