import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAdminApi } from "@/lib/admin-auth";
import { invalidatePixelFileCache } from "@/lib/pixel-files";
import {
  backupPixelAvatarAsReference,
  resolveFighterReferenceExtension,
  writeFighterReferenceFile,
} from "@/lib/fighter-reference-files";

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdminApi();
  if (adminCheck.response) return adminCheck.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const sourceFile = formData.get("source_file") as File | null;
  const fighterId = formData.get("fighter_id") as string | null;

  if (!file || !fighterId) {
    return NextResponse.json({ error: "file and fighter_id required" }, { status: 400 });
  }

  // Validate fighter ID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(fighterId)) {
    return NextResponse.json({ error: "invalid fighter_id" }, { status: 400 });
  }

  if (sourceFile && sourceFile.size > 0) {
    const referenceExtension = resolveFighterReferenceExtension(sourceFile.name, sourceFile.type);
    if (!referenceExtension) {
      return NextResponse.json({ error: "unsupported source_file type" }, { status: 400 });
    }

    const sourceBuffer = Buffer.from(await sourceFile.arrayBuffer());
    writeFighterReferenceFile(fighterId, sourceBuffer, referenceExtension);
  } else {
    backupPixelAvatarAsReference(fighterId);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const pixelDir = path.join(process.cwd(), "public/fighters/pixel");
  if (!fs.existsSync(pixelDir)) fs.mkdirSync(pixelDir, { recursive: true });

  const filename = `${fighterId}.png`;
  const filepath = path.join(pixelDir, filename);
  fs.writeFileSync(filepath, buffer);
  invalidatePixelFileCache();

  return NextResponse.json({ path: `/fighters/pixel/${filename}` });
}
