/**
 * Convert ISO 3166-1 alpha-2 country code to flag emoji.
 * e.g. "KR" → "🇰🇷", "US" → "🇺🇸"
 */
export function countryCodeToFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  const offset = 0x1f1e6 - 65; // 'A' = 65
  return String.fromCodePoint(
    upper.charCodeAt(0) + offset,
    upper.charCodeAt(1) + offset
  );
}
