"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Globe, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { retroPanelClassName } from "@/components/ui/retro";
import {
  buildPreferredTimezoneList,
  getAllTimezones,
  getTimezoneAbbreviation,
} from "@/lib/timezone";
import { useIsMounted } from "@/lib/use-sync-store";

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
  searchKey: string;
  isDetected: boolean;
};

function buildEntry(tz: string, detected: string, locale: string): ZoneEntry {
  const abbr = getTimezoneAbbreviation(tz, locale);
  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  return {
    id: tz,
    abbr,
    city,
    searchKey: `${tz} ${city} ${abbr}`.toLowerCase(),
    isDetected: tz === detected,
  };
}

/**
 * Timezone picker that mirrors the LanguagePicker visual language: a small
 * pill trigger (border + ChevronDown), then a `retroPanelClassName` panel
 * with a Check-marked active row. The only deltas vs LanguagePicker:
 *
 * - We render the panel through `createPortal` into `document.body`. The
 *   trigger lives inside the hero section which uses `overflow-hidden` for
 *   its background poster, and an absolute panel would be clipped by that
 *   parent. The portal escapes the clip and floats above the hero.
 * - The panel includes a search input because the IANA list has 400+
 *   entries — a flat scroll like LanguagePicker would be unusable.
 *
 * Position is computed from the trigger's bounding rect on every open and
 * on scroll/resize, with a 2px gap so the panel sits flush against the
 * trigger as requested.
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
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  // `createPortal` requires `document`, so we gate on a client mount flag
  // provided by a zero-cost useSyncExternalStore helper. This replaces the
  // old `useEffect(() => setMounted(true), [])` pattern and keeps the
  // `react-hooks/set-state-in-effect` rule clean.
  const mounted = useIsMounted();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const preferredEntries = useMemo(
    () =>
      buildPreferredTimezoneList(detected).map((tz) =>
        buildEntry(tz, detected, locale),
      ),
    [detected, locale],
  );

  const allEntries = useMemo(() => {
    const seen = new Set(preferredEntries.map((e) => e.id));
    return getAllTimezones()
      .filter((tz) => !seen.has(tz))
      .map((tz) => buildEntry(tz, detected, locale));
  }, [preferredEntries, detected, locale]);

  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  const filteredEntries = useMemo(() => {
    if (!isSearching) return [] as ZoneEntry[];
    return [...preferredEntries, ...allEntries].filter((entry) =>
      entry.searchKey.includes(trimmedQuery),
    );
  }, [isSearching, preferredEntries, allEntries, trimmedQuery]);

  const updateRect = useCallback(() => {
    if (triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
  }, []);

  // Capture initial rect synchronously when the popover opens so it
  // appears in the right place on the very first paint.
  useLayoutEffect(() => {
    if (open) updateRect();
  }, [open, updateRect]);

  // Track scroll/resize so the floating panel stays anchored to the
  // trigger as the page moves underneath it.
  useEffect(() => {
    if (!open) return;
    const handler = () => updateRect();
    window.addEventListener("resize", handler);
    // Capture phase so we observe scroll on every ancestor, not just window.
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, updateRect]);

  // Outside click + Escape — outside check has to consider both the
  // trigger and the portal panel since they live in different DOM trees.
  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Focus the search input when the panel opens.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const selectedAbbr = useMemo(
    () => getTimezoneAbbreviation(value, locale),
    [value, locale],
  );
  const selectedCity = value.split("/").pop()?.replace(/_/g, " ") ?? value;
  const triggerLabel = selectedAbbr || selectedCity;

  const handlePick = (tz: string) => {
    onChange(tz);
    setOpen(false);
    setQuery("");
  };

  // 2px gap below the trigger as requested. Use a fixed 260px panel width;
  // clamp the left so the panel never overflows the right viewport edge.
  const PANEL_WIDTH = 260;
  const PANEL_GAP = 2;
  const panelStyle: React.CSSProperties | undefined = triggerRect
    ? {
        position: "fixed",
        top: triggerRect.bottom + PANEL_GAP,
        left: Math.min(
          triggerRect.left,
          (typeof window !== "undefined" ? window.innerWidth : 0) -
            PANEL_WIDTH -
            8,
        ),
        width: PANEL_WIDTH,
        zIndex: 1000,
      }
    : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[var(--bp-line)] px-2.5 text-sm text-[var(--bp-ink)] transition hover:border-[rgba(255,255,255,0.15)] hover:bg-[var(--bp-card-inset)]",
          className,
        )}
      >
        <Globe className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      </button>

      {mounted && open && triggerRect
        ? createPortal(
            <div
              ref={panelRef}
              role="listbox"
              aria-label="Timezone selection"
              style={panelStyle}
              className={retroPanelClassName({
                className:
                  "overflow-hidden p-1 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]",
              })}
            >
              {/* Search input */}
              <div className="relative px-1 pt-1 pb-1.5">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--bp-muted)]"
                  strokeWidth={1.8}
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search timezone…"
                  className="h-8 w-full rounded-[8px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] pl-8 pr-7 text-xs text-[var(--bp-ink)] placeholder:text-[var(--bp-muted)] focus:border-[var(--bp-accent)] focus:outline-none"
                />
                {query ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--bp-muted)] hover:text-[var(--bp-ink)]"
                  >
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                ) : null}
              </div>

              {/* List */}
              <div className="max-h-[260px] overflow-y-auto">
                {isSearching ? (
                  filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                      <ZoneRow
                        key={entry.id}
                        entry={entry}
                        isSelected={entry.id === value}
                        onPick={handlePick}
                      />
                    ))
                  ) : (
                    <p className="px-3 py-4 text-center text-xs text-[var(--bp-muted)]">
                      No matches
                    </p>
                  )
                ) : (
                  <>
                    <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--bp-muted)]">
                      Suggested
                    </p>
                    {preferredEntries.map((entry) => (
                      <ZoneRow
                        key={entry.id}
                        entry={entry}
                        isSelected={entry.id === value}
                        onPick={handlePick}
                      />
                    ))}
                    <p className="px-3 pb-1 pt-2 text-[10px] text-[var(--bp-muted)]">
                      Need another zone? Type to search.
                    </p>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ZoneRow({
  entry,
  isSelected,
  onPick,
}: {
  entry: ZoneEntry;
  isSelected: boolean;
  onPick: (tz: string) => void;
}) {
  const label = entry.abbr ? `${entry.abbr} · ${entry.city}` : entry.city;
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => onPick(entry.id)}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm transition",
        isSelected
          ? "bg-[var(--bp-accent-dim)] font-semibold text-[var(--bp-ink)]"
          : "text-[var(--bp-muted)] hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]",
      )}
    >
      <span className="flex flex-1 items-center gap-2 truncate text-left">
        <span className="truncate">{label}</span>
        {entry.isDetected ? (
          <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--bp-accent)]">
            auto
          </span>
        ) : null}
      </span>
      {isSelected ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--bp-accent)]" strokeWidth={2.5} />
      ) : null}
    </button>
  );
}
