/**
 * Centralized BlackPick brand tokens for places that cannot read CSS
 * custom properties at render time — specifically Next.js `ImageResponse`
 * routes (opengraph-image.tsx, apple-icon.tsx) which run in an isolated
 * edge runtime with no CSS context.
 *
 * Keep these values in sync with `src/app/globals.css`:
 *   --retro-accent → BRAND_ACCENT
 *   --bp-bg        → BRAND_BG
 */

export const BRAND_ACCENT = "#ffba3c";
export const BRAND_ACCENT_DIM = "rgba(255, 186, 60, 0.6)";
export const BRAND_BG = "#0a0a0a";
export const BRAND_BG_LIGHT = "#1a1a1a";
