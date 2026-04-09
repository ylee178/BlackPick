import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { findFighterReferenceFile } from "@/lib/fighter-reference-files";
import { getFighterPixelFilepath } from "@/lib/pixel-files";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Original reference photo takes priority — pixel is the cropped derivative
  const referenceFile = findFighterReferenceFile(id);
  if (referenceFile) {
    const buffer = fs.readFileSync(referenceFile.filepath);
    return new NextResponse(buffer, {
      headers: { "Content-Type": referenceFile.contentType, "Cache-Control": "no-cache" },
    });
  }

  const pixelPath = getFighterPixelFilepath(id);
  if (pixelPath && fs.existsSync(pixelPath)) {
    const buffer = fs.readFileSync(pixelPath);
    return new NextResponse(buffer, {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-cache" },
    });
  }

  return NextResponse.json({ error: "not found" }, { status: 404 });
}
