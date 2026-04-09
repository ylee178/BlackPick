import fs from "fs";
import path from "path";

let _pixelCache: Set<string> | null = null;
let _pixelCacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute
const PIXEL_DIR = path.join(process.cwd(), "public/fighters/pixel");
const PIXEL_FILE_RE = /^([0-9a-f-]+)(?:_v(\d+))?\.png$/;

function sortPixelFilenames(a: string, b: string) {
  const aMatch = a.match(PIXEL_FILE_RE);
  const bMatch = b.match(PIXEL_FILE_RE);
  const aVersion = aMatch?.[2] ? Number(aMatch[2]) : null;
  const bVersion = bMatch?.[2] ? Number(bMatch[2]) : null;

  if (aVersion === null && bVersion !== null) return -1;
  if (aVersion !== null && bVersion === null) return 1;
  if (aVersion !== null && bVersion !== null) return bVersion - aVersion;
  return a.localeCompare(b);
}

/** Cached fs.readdirSync for pixel art files. Server-only. */
export function getPixelFiles(): Set<string> {
  const now = Date.now();
  if (_pixelCache && now - _pixelCacheTime < CACHE_TTL) return _pixelCache;

  _pixelCache = new Set(
    fs.existsSync(PIXEL_DIR)
      ? fs.readdirSync(PIXEL_DIR).filter((f) => PIXEL_FILE_RE.test(f))
      : [],
  );
  _pixelCacheTime = now;
  return _pixelCache;
}

export function invalidatePixelFileCache() {
  _pixelCache = null;
  _pixelCacheTime = 0;
}

export function listFighterPixelFilenames(
  fighterId: string,
  pixelFiles: Set<string> = getPixelFiles(),
) {
  return Array.from(pixelFiles)
    .filter((filename) => {
      const match = filename.match(PIXEL_FILE_RE);
      return match?.[1] === fighterId;
    })
    .sort(sortPixelFilenames);
}

export function findFighterPixelFilename(
  fighterId: string,
  pixelFiles: Set<string> = getPixelFiles(),
) {
  return listFighterPixelFilenames(fighterId, pixelFiles)[0] ?? null;
}

export function hasFighterPixelFile(
  fighterId: string,
  pixelFiles: Set<string> = getPixelFiles(),
) {
  return Boolean(findFighterPixelFilename(fighterId, pixelFiles));
}

export function getFighterPixelPublicUrl(
  fighterId: string,
  pixelFiles: Set<string> = getPixelFiles(),
) {
  const filename = findFighterPixelFilename(fighterId, pixelFiles);
  return filename ? `/fighters/pixel/${filename}` : null;
}

export function getFighterPixelFilepath(
  fighterId: string,
  pixelFiles: Set<string> = getPixelFiles(),
) {
  const filename = findFighterPixelFilename(fighterId, pixelFiles);
  return filename ? path.join(PIXEL_DIR, filename) : null;
}
