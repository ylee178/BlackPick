"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { WLRecord } from "@/components/ui/ranking";
import { ArrowUpAZ, ChevronDown, Globe, Search } from "lucide-react";
import { retroFieldClassName, retroPanelClassName } from "@/components/ui/retro";
import { parseRecord } from "@/lib/parse-record";
import FighterAvatar from "@/components/FighterAvatar";

type FighterItem = {
  id: string;
  name: string;
  record: string;
  flag: string;
  nationalityCode: string | null;
  avatarUrl: string | null;
  weightClass: string | null;
  hasPixelArt?: boolean;
};

const CUSTOM_REGION_LABELS: Record<string, string> = {
  KUR: "Kurdistan",
};

function getRegionLabel(
  regionDisplayNames: Intl.DisplayNames | null,
  code: string,
) {
  const normalized = code.trim().toUpperCase();
  if (CUSTOM_REGION_LABELS[normalized]) {
    return CUSTOM_REGION_LABELS[normalized];
  }

  if (!/^[A-Z]{2}$/.test(normalized) && !/^\d{3}$/.test(normalized)) {
    return normalized;
  }

  try {
    return regionDisplayNames?.of(normalized) ?? normalized;
  } catch {
    return normalized;
  }
}

export default function FighterGrid({ items }: { items: FighterItem[] }) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name_asc" | "wins_desc" | "losses_desc">("name_asc");

  const regionDisplayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  const countryOptions = useMemo(() => {
    const uniqueCodes = Array.from(
      new Set(items.map((item) => item.nationalityCode).filter((code): code is string => Boolean(code))),
    );

    return uniqueCodes
      .map((code) => ({
        code,
        label: getRegionLabel(regionDisplayNames, code),
        flag: items.find((item) => item.nationalityCode === code)?.flag ?? "",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items, regionDisplayNames]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

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
        const matchesCountry = countryFilter === "all" || fighter.nationalityCode === countryFilter;
        return matchesQuery && matchesCountry;
      });

    if (sortBy === "wins_desc") {
      next.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return a.name.localeCompare(b.name, locale, { sensitivity: "base" });
      });
    } else if (sortBy === "losses_desc") {
      next.sort((a, b) => {
        if (b.losses !== a.losses) return b.losses - a.losses;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.name.localeCompare(b.name, locale, { sensitivity: "base" });
      });
    } else {
      // Default name sort: fighters with a pixel-art photo first, then alphabetical by localized name.
      next.sort((a, b) => {
        const aHasPhoto = a.hasPixelArt ? 1 : 0;
        const bHasPhoto = b.hasPixelArt ? 1 : 0;
        if (aHasPhoto !== bHasPhoto) return bHasPhoto - aHasPhoto;
        const byName = a.name.localeCompare(b.name, locale, { sensitivity: "base" });
        if (byName !== 0) return byName;
        return a.originalIndex - b.originalIndex;
      });
    }

    return next;
  }, [countryFilter, items, locale, query, sortBy]);

  return (
    <div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bp-muted)]" strokeWidth={1.8} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("myRecord.searchFighter")}
            className={retroFieldClassName("pl-9 pr-3")}
          />
        </div>

        <div className="relative">
          <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bp-muted)]" strokeWidth={1.8} />
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className={retroFieldClassName("appearance-none pl-9 pr-9")}
            aria-label={t("fighter.filterCountry")}
          >
            <option value="all">{t("fighter.allCountries")}</option>
            {countryOptions.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag ? `${country.flag} ` : ""}{country.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bp-muted)]" strokeWidth={1.8} />
        </div>

        <div className="relative">
          <ArrowUpAZ className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bp-muted)]" strokeWidth={1.8} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className={retroFieldClassName("appearance-none pl-9 pr-9")}
            aria-label={t("fighter.sortBy")}
          >
            <option value="name_asc">{t("fighter.sortNameAsc")}</option>
            <option value="wins_desc">{t("fighter.sortWinsDesc")}</option>
            <option value="losses_desc">{t("fighter.sortLossesDesc")}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bp-muted)]" strokeWidth={1.8} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filtered.map((f) => {
          return (
            <Link
              key={f.id}
              href={`/fighters/${f.id}`}
              className={retroPanelClassName({ interactive: true, className: "flex flex-col items-center p-3 text-center" })}
            >
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bp-line)] bg-[#2a2a2a]">
                <FighterAvatar
                  src={f.avatarUrl || "/fighters/default.png"}
                  alt={f.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-[var(--bp-ink)]">
                {f.name} {f.flag}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs">
                <WLRecord wins={f.wins} losses={f.losses} size="xs" />
                {f.draws > 0 && <span className="text-[var(--bp-muted)]">{f.draws}D</span>}
              </p>
              {f.weightClass && (
                <p className="mt-0.5 truncate text-[11px] text-[var(--bp-muted)]">{f.weightClass}</p>
              )}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-center text-sm text-[var(--bp-muted)]">{t("fighter.noResults")}</p>
      )}
    </div>
  );
}
