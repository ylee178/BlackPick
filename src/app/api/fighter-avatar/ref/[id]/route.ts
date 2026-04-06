import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filepath = path.join(process.cwd(), "Fighter_Images", "refs", `${id}.png`);

  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filepath);
  return new NextResponse(buffer, {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-cache" },
  });
}
