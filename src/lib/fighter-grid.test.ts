import { describe, expect, it } from "vitest";

import {
  buildCountryOptions,
  filterAndSortFighters,
  getRegionLabel,
  type FighterGridItem,
} from "./fighter-grid";

const fighters: FighterGridItem[] = [
  {
    id: "1",
    name: "Alpha",
    record: "10-2-0",
    flag: "🇰🇷",
    nationalityCode: "KR",
    avatarUrl: null,
    weightClass: "Lightweight",
  },
  {
    id: "2",
    name: "Bravo",
    record: "8-6-0",
    flag: "🇯🇵",
    nationalityCode: "JP",
    avatarUrl: null,
    weightClass: "Welterweight",
  },
  {
    id: "3",
    name: "Charlie",
    record: "10-4-0",
    flag: "🏴",
    nationalityCode: "KUR",
    avatarUrl: null,
    weightClass: "Featherweight",
  },
  {
    id: "4",
    name: "Delta",
    record: "4-9-0",
    flag: "🇰🇷",
    nationalityCode: "kr",
    avatarUrl: null,
    weightClass: "Middleweight",
  },
];

describe("fighter-grid helpers", () => {
  it("maps custom and invalid region codes safely", () => {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

    expect(getRegionLabel(displayNames, "KUR")).toBe("Kurdistan");
    expect(getRegionLabel(displayNames, "kr")).toBe("South Korea");
    expect(getRegionLabel(displayNames, "??")).toBe("??");
  });

  it("builds country options with localized labels", () => {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    const options = buildCountryOptions(fighters, displayNames);

    expect(options).toEqual([
      { code: "JP", label: "Japan", flag: "🇯🇵" },
      { code: "KUR", label: "Kurdistan", flag: "🏴" },
      { code: "KR", label: "South Korea", flag: "🇰🇷" },
    ]);
  });

  it("defaults to wins-desc sorting with losses tiebreaker", () => {
    const result = filterAndSortFighters(fighters, {
      query: "",
      countryFilter: "all",
      sortBy: "wins_desc",
    });

    expect(result.map((fighter) => fighter.name)).toEqual(["Alpha", "Charlie", "Bravo", "Delta"]);
  });

  it("filters by query and country before sorting", () => {
    const result = filterAndSortFighters(fighters, {
      query: "a",
      countryFilter: "KR",
      sortBy: "wins_desc",
    });

    expect(result.map((fighter) => fighter.name)).toEqual(["Alpha", "Delta"]);
  });

  it("sorts by losses descending when requested", () => {
    const result = filterAndSortFighters(fighters, {
      query: "",
      countryFilter: "all",
      sortBy: "losses_desc",
    });

    expect(result.map((fighter) => fighter.name)).toEqual(["Delta", "Bravo", "Charlie", "Alpha"]);
  });
});
