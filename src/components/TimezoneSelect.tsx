"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Globe, Search, X } from "lucide-react";
import {
  buildPreferredTimezoneList,
  getAllTimezones,
  getTimezoneAbbreviation,
} from "@/lib/timezone";

type TimezoneSelectProps = {
  value: string;
  detected: string;
  onChange: (timeZone: string) => void;
  locale?: string;
  ariaLabel?: string;
  className?: string;
};

type ZoneEntry = {
  id: string;
  abbr: string;
  city: string;
  label: string;
  searchKey: string;
  isDetected: boolean;
};

function buildEntry(tz: string, detected: string, locale: string): ZoneEntry {
  const abbr = getTimezoneAbbreviation(tz, locale);
  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  const label = abbr ? `${abbr} · ${city}` : city;
  return {
    id: tz,
    abbr,
    city,
    label,
    searchKey: `${tz} ${city} ${abbr}`.toLowerCase(),
    isDetected: tz === detected,
  };
}

/**
 * Compact searchable timezone picker for the FlipTimer label row.
 *
 * The picker shows a small pill in its closed state. Clicking it opens a
 * popover with a search box plus two sections:
 *
 *   • Suggested — the auto-detected zone, Asia/Seoul (the venue), and a
 *     curated list of zones for BlackPick's locales. Always visible at
 *     the top of the unfiltered list.
 *   • All timezones — the rest of the IANA database, hidden until the
 *     user types into the search box. We deliberately do not dump 400+
 *     zones into a flat list; the search filter is the affordance for
 *     finding anything outside the suggested set.
 *
 * No external popover library needed — closing on outside click and
 * Escape is enough for this control.
 */
export default function TimezoneSelect({
  value,
  detected,
  onChange,
  locale = "en",
  ariaLabel,
  className,
}: TimezoneSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const preferredEntries = useMemo(() => {
    return buildPreferredTimezoneList(detected).map((tz) =>
      buildEntry(tz, detected, locale),
    );
  }, [detected, locale]);

  const allEntries = useMemo(() => {
    const seen = new Set(preferredEntries.map((entry) => entry.id));
    return getAllTimezones()
      .filter((tz) => !seen.has(tz))
      .map((tz) => buildEntry(tz, detected, locale));
  }, [preferredEntries, detected, locale]);

  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  const filteredEntries = useMemo(() => {
    if (!isSearching) return [] as ZoneEntry[];
    const all = [...preferredEntries, ...allEntries];
    return all.filter((entry) => entry.searchKey.includes(trimmedQuery));
  }, [isSearching, preferredEntries, allEntries, trimmedQuery]);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus the search box when the popover opens.
  useEffect(() => {
    if (open) {
      // Microtask delay so the input is in the DOM before focusing.
      const id = window.setTimeout(() => searchInputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const selectedEntry = useMemo(
    () => buildEntry(value, detected, locale),
    [value, detected, locale],
  );

  const handlePick = (tz: string) => {
    onChange(tz);
    setOpen(false);
    setQuery("");
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-[180px] ${className ?? ""}`}
    >
      {/* Trigger pill */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-7 w-full items-center gap-1.5 truncate rounded-[10px] border border-[var(--bp-line)] bg-black px-2 text-[11px] text-[var(--bp-ink)] transition hover:border-[var(--bp-accent)]/50 focus:border-[var(--bp-accent)] focus:outline-none"
      >
        <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--bp-muted)]" strokeWidth={1.8} aria-hidden />
        <span className="flex-1 truncate text-left">{selectedEntry.label}</span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 text-[var(--bp-muted)]"
          strokeWidth={1.8}
          aria-hidden
        />
      </button>

      {/* Popover */}
      {open ? (
        <div
          role="listbox"
          className="absolute left-1/2 top-[calc(100%+6px)] z-30 w-[260px] -translate-x-1/2 rounded-[12px] border border-[var(--bp-line)] bg-[var(--bp-card)] p-2 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]"
        >
          {/* Search input */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--bp-muted)]"
              strokeWidth={1.8}
              aria-hidden
            />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search timezone…"
              className="h-8 w-full rounded-[8px] border border-[var(--bp-line)] bg-black pl-7 pr-7 text-[11px] text-[var(--bp-ink)] placeholder:text-[var(--bp-muted)] focus:border-[var(--bp-accent)] focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--bp-muted)] hover:text-[var(--bp-ink)]"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            ) : null}
          </div>

          {/* List */}
          <div className="mt-2 max-h-[260px] overflow-y-auto">
            {isSearching ? (
              filteredEntries.length > 0 ? (
                <ul className="space-y-0.5">
                  {filteredEntries.map((entry) => (
                    <ZoneOption
                      key={entry.id}
                      entry={entry}
                      isSelected={entry.id === value}
                      onPick={handlePick}
                    />
                  ))}
                </ul>
              ) : (
                <p className="px-2 py-3 text-center text-[11px] text-[var(--bp-muted)]">
                  No matches
                </p>
              )
            ) : (
              <>
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--bp-muted)]">
                  Suggested
                </p>
                <ul className="space-y-0.5">
                  {preferredEntries.map((entry) => (
                    <ZoneOption
                      key={entry.id}
                      entry={entry}
                      isSelected={entry.id === value}
                      onPick={handlePick}
                    />
                  ))}
                </ul>
                <p className="mt-2 px-2 text-[10px] text-[var(--bp-muted)]">
                  Need another zone? Type to search all timezones.
                </p>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ZoneOption({
  entry,
  isSelected,
  onPick,
}: {
  entry: ZoneEntry;
  isSelected: boolean;
  onPick: (tz: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(entry.id)}
        className={`flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-[11px] transition hover:bg-white/[0.04] ${
          isSelected ? "bg-white/[0.06] text-[var(--bp-ink)]" : "text-[var(--bp-muted)]"
        }`}
      >
        <span className="flex-1 truncate">
          {entry.label}
          {entry.isDetected ? (
            <span className="ml-1 text-[9px] uppercase tracking-[0.08em] text-[var(--bp-accent)]">
              auto
            </span>
          ) : null}
          <span className="ml-1 text-[9px] text-[var(--bp-muted)]">{entry.id}</span>
        </span>
        {isSelected ? (
          <Check className="h-3 w-3 shrink-0 text-[var(--bp-accent)]" strokeWidth={2.5} aria-hidden />
        ) : null}
      </button>
    </li>
  );
}
