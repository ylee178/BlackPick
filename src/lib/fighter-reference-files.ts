import fs from "fs";
import path from "path";
import { getFighterPixelFilepath } from "@/lib/pixel-files";

const REF_DIR = path.join(process.cwd(), "Fighter_Images", "refs");
const REF_DIR_RESOLVED = path.resolve(REF_DIR);

const REF_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"] as const;

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
};

function getReferenceBasenames(fighterId: string) {
  return Array.from(new Set([fighterId, fighterId.slice(0, 8)].filter(Boolean)));
}

function resolveReferencePath(filename: string) {
  const filepath = path.resolve(REF_DIR_RESOLVED, filename);
  return filepath.startsWith(`${REF_DIR_RESOLVED}${path.sep}`) ? filepath : null;
}

export function findFighterReferenceFile(fighterId: string): {
  filepath: string;
  filename: string;
  contentType: string;
} | null {
  if (!fs.existsSync(REF_DIR)) return null;

  for (const basename of getReferenceBasenames(fighterId)) {
    for (const extension of REF_EXTENSIONS) {
      const filename = `${basename}${extension}`;
      const filepath = resolveReferencePath(filename);

      if (filepath && fs.existsSync(filepath)) {
        return {
          filepath,
          filename,
          contentType: CONTENT_TYPES[extension] ?? "application/octet-stream",
        };
      }
    }
  }

  return null;
}
export function ensureFighterReferenceDir() {
  if (!fs.existsSync(REF_DIR)) {
    fs.mkdirSync(REF_DIR, { recursive: true });
  }
}

export function resolveFighterReferenceExtension(fileName?: string | null, mimeType?: string | null) {
  const normalizedType = mimeType?.toLowerCase().trim();
  if (normalizedType === "image/png") return ".png";
  if (normalizedType === "image/jpeg") return ".jpg";
  if (normalizedType === "image/webp") return ".webp";
  if (normalizedType === "image/avif") return ".avif";
  if (normalizedType === "image/gif") return ".gif";

  const extension = path.extname(fileName ?? "").toLowerCase();
  return REF_EXTENSIONS.includes(extension as (typeof REF_EXTENSIONS)[number]) ? extension : null;
}

export function removeFighterReferenceFiles(fighterId: string) {
  if (!fs.existsSync(REF_DIR)) return;

  for (const basename of getReferenceBasenames(fighterId)) {
    for (const extension of REF_EXTENSIONS) {
      const filepath = resolveReferencePath(`${basename}${extension}`);
      if (filepath && fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }
  }
}

export function writeFighterReferenceFile(fighterId: string, buffer: Buffer, extension: string) {
  ensureFighterReferenceDir();
  removeFighterReferenceFiles(fighterId);

  const normalizedExtension = extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  const filepath = resolveReferencePath(`${fighterId}${normalizedExtension}`);
  if (!filepath) {
    throw new Error("Invalid fighter reference path");
  }
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

export function backupPixelAvatarAsReference(fighterId: string) {
  if (findFighterReferenceFile(fighterId)) return;

  const pixelFilepath = getFighterPixelFilepath(fighterId);
  if (!pixelFilepath || !fs.existsSync(pixelFilepath)) return;

  ensureFighterReferenceDir();
  const filepath = resolveReferencePath(`${fighterId}.png`);
  if (!filepath) {
    throw new Error("Invalid fighter reference path");
  }
  fs.copyFileSync(pixelFilepath, filepath);
}
