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

const SERIES_LABELS_EN: Record<string, string> = {
  black_cup: "Black Cup",
  numbering: "Numbering",
  rise: "Rise",
  other: "Champions League",
};

// English-only series label for the admin surface (no locale context).
export function getSeriesLabelEn(type: string): string {
  return SERIES_LABELS_EN[type] ?? type;
}
