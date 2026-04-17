import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { requireAdminApi } from "@/lib/admin-auth";
import { findFighterReferenceFile } from "@/lib/fighter-reference-files";
import { getFighterPixelFilepath } from "@/lib/pixel-files";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdminApi();
  if (adminCheck.response) return adminCheck.response;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid fighter id" }, { status: 400 });
  }

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
