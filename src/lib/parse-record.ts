/**
 * Parse fighter record string into W/L/D components.
 * Supports: "5W 8L 1D", "5W 3L", "5-3", "5-3-1", "0-0"
 */
export function parseRecord(record: string | null | undefined): {
  wins: string;
  losses: string;
  draws: string | null;
} {
  const str = (record || "0-0").trim();

  // "5W 8L 1D" or "5W 3L" format
  const wldMatch = str.match(/(\d+)\s*W\s+(\d+)\s*L(?:\s+(\d+)\s*D)?/i);
  if (wldMatch) {
    return {
      wins: wldMatch[1],
      losses: wldMatch[2],
      draws: wldMatch[3] || null,
    };
  }

  // "5-3" or "5-3-1" format
  const parts = str.split("-");
  return {
    wins: parts[0] || "0",
    losses: parts[1] || "0",
    draws: parts[2] || null,
  };
}
