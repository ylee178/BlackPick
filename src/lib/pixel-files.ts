import fs from "fs";
import path from "path";

let _pixelCache: Set<string> | null = null;
let _pixelCacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

/** Cached fs.readdirSync for pixel art files. Server-only. */
export function getPixelFiles(): Set<string> {
  const now = Date.now();
  if (_pixelCache && now - _pixelCacheTime < CACHE_TTL) return _pixelCache;

  const pixelDir = path.join(process.cwd(), "public/fighters/pixel");
  _pixelCache = new Set(
    fs.existsSync(pixelDir)
      ? fs.readdirSync(pixelDir).filter((f) => /^[0-9a-f-]+(_v\d+)?\.png$/.test(f))
      : [],
  );
  _pixelCacheTime = now;
  return _pixelCache;
}
