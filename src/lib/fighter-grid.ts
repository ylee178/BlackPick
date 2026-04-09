import { parseRecord } from "./parse-record";

export type FighterGridItem = {
  id: string;
  name: string;
  record: string;
  flag: string;
  nationalityCode: string | null;
  avatarUrl: string | null;
  weightClass: string | null;
  hasPixelArt?: boolean;
};

export type FighterGridSort = "name_asc" | "wins_desc" | "losses_desc";

export const CUSTOM_REGION_LABELS: Record<string, string> = {
  KUR: "Kurdistan",
};

export function getRegionLabel(regionDisplayNames: Intl.DisplayNames | null, code: string) {
  const normalized = code.trim().toUpperCase();
  if (CUSTOM_REGION_LABELS[normalized]) return CUSTOM_REGION_LABELS[normalized];
  if (!/^[A-Z]{2}$/.test(normalized) && !/^\d{3}$/.test(normalized)) return normalized;

  try {
    return regionDisplayNames?.of(normalized) ?? normalized;
  } catch {
    return normalized;
  }
}

export function buildCountryOptions(items: FighterGridItem[], regionDisplayNames: Intl.DisplayNames | null) {
  const uniqueCodes = Array.from(
    new Set(
      items
        .map((item) => item.nationalityCode?.trim().toUpperCase() ?? null)
        .filter((code): code is string => Boolean(code)),
    ),
  );

  return uniqueCodes
    .map((code) => ({
      code,
      label: getRegionLabel(regionDisplayNames, code),
      flag: items.find((item) => item.nationalityCode?.trim().toUpperCase() === code)?.flag ?? "",
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function filterAndSortFighters(
  items: FighterGridItem[],
  {
    query,
    countryFilter,
    sortBy,
  }: {
    query: string;
    countryFilter: string;
    sortBy: FighterGridSort;
  },
) {
  const q = query.trim().toLowerCase();
  const normalizedCountryFilter = countryFilter.trim().toUpperCase();

  const next = items
    .map((fighter, index) => {
      const { wins, losses, draws } = parseRecord(fighter.record);
      return {
        ...fighter,
        wins: Number(wins) || 0,
        losses: Number(losses) || 0,
        draws: Number(draws) || 0,
        originalIndex: index,
      };
    })
    .filter((fighter) => {
      const matchesQuery = !q || fighter.name.toLowerCase().includes(q);
      const fighterCountry = fighter.nationalityCode?.trim().toUpperCase() ?? null;
      const matchesCountry = normalizedCountryFilter === "ALL" || fighterCountry === normalizedCountryFilter;
      return matchesQuery && matchesCountry;
    });

  if (sortBy === "wins_desc") {
    next.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.name.localeCompare(b.name);
    });
  } else if (sortBy === "losses_desc") {
    next.sort((a, b) => {
      if (b.losses !== a.losses) return b.losses - a.losses;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.name.localeCompare(b.name);
    });
  } else {
    next.sort((a, b) => {
      const byName = a.name.localeCompare(b.name);
      if (byName !== 0) return byName;
      return a.originalIndex - b.originalIndex;
    });
  }

  return next;
}
