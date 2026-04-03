export const SERIES_LABELS: Record<string, string> = {
  black_cup: "series.blackCup",
  numbering: "series.numbering",
  rise: "series.rise",
  other: "series.championsLeague",
};

export function getSeriesLabel(type: string, t?: (key: string) => string): string {
  const key = SERIES_LABELS[type];
  if (!key) return type;
  return t ? t(key) : key;
}
