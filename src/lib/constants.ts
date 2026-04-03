export const SERIES_LABELS: Record<string, string> = {
  black_cup: "Black Cup",
  numbering: "Numbering",
  rise: "Rise",
  other: "Champions League",
};

export function getSeriesLabel(type: string): string {
  return SERIES_LABELS[type] || type;
}
