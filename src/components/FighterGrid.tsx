"use client";

import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useTransition,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { WLRecord } from "@/components/ui/ranking";
import { ArrowUpAZ, ChevronDown, Globe, Search } from "lucide-react";
import { retroFieldClassName, retroPanelClassName } from "@/components/ui/retro";
import { parseRecord } from "@/lib/parse-record";
import { getWeightClassOrder } from "@/lib/weight-class";
import FighterAvatar from "@/components/FighterAvatar";
import {
  DEFAULT_COUNTRY,
  type GridState,
  type SortKey,
  buildFightersHref,
  isEqualState,
  isSortKey,
  parseStateFromParams,
  readPersistedState,
  serializeStateToQuery,
  writePersistedState,
} from "@/lib/fighter-grid-state";

type FighterItem = {
  id: string;
  name: string;
  record: string;
  flag: string;
  nationalityCode: string | null;
  avatarUrl: string | null;
  weightClass: string | null;
  hasPixelArt?: boolean;
  /** Precomputed server-side (see `/fighters/page.tsx`). Drives the
   *  rank/champion line on the grid card. Weight class stays as
   *  `weightClass` above for the uppercase caption below the record. */
  divisionChip?: {
    weightLabel: string | null;
    rankLabel: string;
    tone: "champion" | "ranked";
  } | null;
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

/**
 * FighterGrid state model — URL is the committed source of truth.
 * Optimistic state is a plain `useState` (concurrent-safe, no
 * render-time ref mutation), plus a handler-only ref that holds the
 * "last intended state" for rapid-click merging. `useTransition` gates
 * the resync so fast successive clicks don't flicker backwards.
 *
 * Three distinct pieces of state:
 *
 *   1. Committed URL state      → derived every render from searchParams
 *   2. Optimistic display state → `optimisticState` useState, cleared during render
 *                                 when the transition has settled and drifted from committed
 *   3. Latest intent ref        → `latestOptimisticRef`, mutated ONLY in event handlers
 *                                 (safe — outside render), read by `applyUrlPatch` for merges
 *
 * The resync rule is subtle: during render, IF the transition has
 * settled (`!isPending`) AND the optimistic state has drifted from
 * committed, call `setOptimisticState(null)`. That's the documented
 * "adjusting state during rendering" pattern — idempotent and
 * concurrent-safe. Writing `setState` inside an effect was flagged by
 * gpt-review as a lint-rule violation and an extra render cascade.
 *
 * Persist policy: localStorage is touched ONLY after a user
 * interaction. Mount-time restore and URL canonicalization never write
 * to localStorage, so a broken share link (e.g. `?sort=garbage`) can't
 * wipe a user's saved preferences. The tradeoff — deep links don't
 * auto-persist — is acceptable; the user can re-select once to save.
 *
 * See `src/lib/fighter-grid-state.ts` for the pure state helpers and
 * `src/lib/fighter-grid-state.test.ts` for the full validation matrix.
 * Architecture decided via two gpt-review.sh free-form consultations on
 * 2026-04-12: the first validated "Exit B" (keep URL-as-state), the
 * second flagged P1–P3 findings against the first implementation. This
 * version resolves all four findings.
 */
export default function FighterGrid({ items }: { items: FighterItem[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");

  const validCountryCodes = useMemo(
    () =>
      new Set(
        items
          .map((item) => item.nationalityCode)
          .filter((code): code is string => Boolean(code)),
      ),
    [items],
  );

  // Committed URL state — derived every render, never mirrored to
  // component state, never synced via effect. Back/forward, pasted
  // links, and external navigation flow through here for free.
  const parsed = useMemo(
    () => parseStateFromParams(searchParams, validCountryCodes),
    [searchParams, validCountryCodes],
  );
  const committedState = parsed.state;
  const { hasAnyRawParams, needsCanonicalize } = parsed.meta;

  // useTransition marks router navigations as non-urgent and exposes
  // `isPending` synchronously on the next render.
  const [isPending, startTransition] = useTransition();

  // Canonical string representation of the current URL query.
  // Compared by VALUE (not object identity) so a fresh
  // `ReadonlyURLSearchParams` wrapper for the same query — which
  // Next.js can hand back on unrelated re-renders — doesn't
  // falsely trigger state resync or flicker.
  const searchParamsString = searchParams.toString();

  // Optimistic display state, anchored to the `searchParamsString`
  // it was set against. The anchor makes the optimistic value
  // auto-invalidate when the URL moves on (either our own commit
  // lands OR external nav happens), without any render-time setState
  // or ref-read-in-render. `displayState` checks
  // `anchorQuery === searchParamsString` to decide whether the
  // optimistic value is still current.
  //
  // Prior iterations used a bare `GridState | null` + render-time
  // clear, which raced during rapid clicks when an older
  // transition's commit landed and cleared the newer optimistic
  // intent (round-10 gpt-review P1). Anchoring each optimistic
  // value to the URL it was targeting eliminates the race — two
  // rapid clicks both anchor to the same old URL, so both reads
  // show the latest optimistic value until the URL actually
  // commits to either. Once any navigation settles, the anchor
  // mismatches and `displayState` falls through to `committedState`.
  const [optimisticState, setOptimisticState] = useState<
    { value: GridState; anchorQuery: string } | null
  >(null);

  // Latest intent ref — synchronous merge buffer for rapid-click
  // handlers. Read ONLY in event handlers (safe — the lint rule
  // forbids render-time access, not handler access). Written by
  // handlers on every commit, resynced from committed state by the
  // layout effect whenever the query string actually changes.
  //
  // Layout effect (not passive effect) guarantees the resync runs
  // synchronously after DOM commit but BEFORE the browser paints or
  // any click event fires — no window where the ref is stale when
  // a handler reads it. Comparing by value (`.toString()`) instead
  // of object identity means unrelated re-renders that hand back a
  // fresh `ReadonlyURLSearchParams` don't falsely trigger a resync.
  const latestIntentRef = useRef<GridState>(committedState);
  const seenQueryForIntentRef = useRef<string>(searchParamsString);
  useLayoutEffect(() => {
    // URL change: always resync (committed state is authoritative
    // after any navigation, whether ours or external).
    if (seenQueryForIntentRef.current !== searchParamsString) {
      latestIntentRef.current = committedState;
      seenQueryForIntentRef.current = searchParamsString;
      return;
    }
    // URL unchanged but committedState changed for another reason
    // (items prop rebuilt validCountryCodes, re-parsing flipped a
    // country code validity, etc.). Resync — but ONLY when not
    // pending, so our own in-flight transition's intent isn't
    // clobbered by this secondary path. Round-9 gpt-review fix.
    if (!isPending && !isEqualState(latestIntentRef.current, committedState)) {
      latestIntentRef.current = committedState;
    }
  }, [searchParamsString, committedState, isPending]);

  // What the UI actually renders from. Optimistic state is shown
  // only if (a) a transition is pending AND (b) the optimistic
  // value's `anchorQuery` still matches the current URL query. Once
  // any navigation commits (ours or external), the query changes,
  // the anchor mismatches, and `displayState` falls through to
  // `committedState`. No explicit clearing needed, no races.
  const optimisticIsCurrent =
    optimisticState !== null &&
    optimisticState.anchorQuery === searchParamsString;
  const displayState: GridState =
    isPending && optimisticIsCurrent ? optimisticState!.value : committedState;

  // Pending persist target. Set in `commitUrlState` on every user
  // commit. The persist effect writes to localStorage ONLY when the
  // settled committedState matches this target, then clears it. When
  // the settled committedState doesn't match (transition superseded
  // by external nav / cancelled), the target is also cleared so a
  // stale target doesn't linger and cause accidental future writes.
  const pendingPersistRef = useRef<GridState | null>(null);

  // Canonicalization target query string — set by the canonicalization
  // effect BEFORE it fires a replace. Compared against
  // `searchParamsString` in the restore effect: if they match, the
  // current URL IS the canonicalization output, and we skip restore
  // so a shared `/fighters?sort=garbage` link that canonicalizes to
  // `/fighters` doesn't get overridden by the viewer's saved prefs.
  // Tracking the exact target query (not a boolean flag) handles the
  // case where canonicalization produces a non-clean URL like
  // `?wc=KR&utm=x` — round-9 gpt-review flagged the flag-based
  // approach as leaking when the target URL still has sort/wc.
  const canonicalizedTargetQueryRef = useRef<string | null>(null);

  // Core navigation helper for USER-driven interactions. Snaps the
  // intent ref, records the pending persist target, then fires a
  // transition-wrapped navigation. Unrelated query params (utm,
  // feature flags, etc) are preserved via `searchParams` → href.
  //
  // Not called from the mount-restore or canonicalization effects —
  // those use `router.replace` directly to avoid set-state-in-effect.
  const commitUrlState = useCallback(
    (next: GridState, mode: "push" | "replace") => {
      // Short-circuit no-op pushes: transition settled AND target
      // already matches committed URL. During pending we don't
      // short-circuit — a follow-up click with the same sort but
      // different country must still propagate.
      if (!isPending && isEqualState(next, committedState)) return;

      latestIntentRef.current = next;
      pendingPersistRef.current = next;
      setOptimisticState({ value: next, anchorQuery: searchParamsString });
      const href = buildFightersHref(pathname, next, searchParams);
      startTransition(() => {
        if (mode === "push") {
          router.push(href, { scroll: false });
        } else {
          router.replace(href, { scroll: false });
        }
      });
    },
    [
      pathname,
      router,
      searchParams,
      searchParamsString,
      isPending,
      committedState,
    ],
  );

  // Patch helper — merges against `latestIntentRef`. The ref is
  // updated synchronously in every user handler AND resynced from
  // committed state via layout effect when transitions settle, so
  // both rapid-click scenarios and post-back-nav scenarios read the
  // correct merge base.
  const applyUrlPatch = useCallback(
    (patch: Partial<GridState>, mode: "push" | "replace") => {
      commitUrlState({ ...latestIntentRef.current, ...patch }, mode);
    },
    [commitUrlState],
  );

  // User-driven handlers default to push — adds a history entry so
  // the back button walks through the sort/filter history.
  const setSortBy = useCallback(
    (nextSort: SortKey) => applyUrlPatch({ sortBy: nextSort }, "push"),
    [applyUrlPatch],
  );
  const setCountryFilter = useCallback(
    (nextCountry: string) =>
      applyUrlPatch({ countryFilter: nextCountry }, "push"),
    [applyUrlPatch],
  );

  // ── Effect ordering ────────────────────────────────────────────
  //
  // React runs passive effects in declaration order on each commit.
  // We exploit this: PERSIST runs first (writes localStorage + clears
  // `pendingPersistRef`), then CANONICALIZATION, then RESTORE. By the
  // time restore reads localStorage, the persist effect has already
  // committed the user's latest state AND cleared the pending gate,
  // so restore never sees stale data. This ordering — plus the
  // `pendingPersistRef !== null` gate inside restore — is what
  // closes the round-6 gpt-review P1 "restore undoes user reset"
  // race.

  // Persist effect — writes COMMITTED state to localStorage ONLY
  // when the settled committedState matches the most recent user
  // commit target, then clears the target. If the settled state
  // doesn't match (transition was superseded or cancelled by
  // external nav), the target is also cleared so a stale pending
  // target can never trigger an accidental write on a future
  // coincidentally-matching commit.
  useEffect(() => {
    if (isPending) return;
    if (pendingPersistRef.current === null) return;
    if (isEqualState(committedState, pendingPersistRef.current)) {
      writePersistedState(committedState);
    }
    // Clear regardless of match outcome — either we wrote (done) or
    // the transition was superseded (stale target, not actionable).
    pendingPersistRef.current = null;
  }, [isPending, committedState]);

  // Canonicalization — runs every time the URL surfaces with
  // non-canonical params (mount, back-navigation to a bad link, paste
  // URL). Calls `router.replace` directly. Before firing, latches
  // `canonicalizedTargetQueryRef` to the exact target query so the
  // restore effect can recognize "this clean URL is canonicalization
  // output" and skip restore — making shared dirty links
  // deterministic (canonicalize to default grid state, don't
  // flip to the viewer's personal saved prefs). Round-8 gpt-review
  // added this guard; round-9 refined it from a boolean flag to
  // exact query matching so non-clean canonicalization targets
  // (like `?wc=KR&utm=x`) don't leak suppression.
  //
  // Includes a drift guard: if `window.location.search` no longer
  // matches the captured searchParams, a user click intervened
  // between render and effect flush, and canonicalization of the
  // OLD URL would clobber the user's fresh intent.
  useEffect(() => {
    if (isPending) return;
    if (!needsCanonicalize) return;

    if (typeof window !== "undefined") {
      const capturedQuery = searchParams.toString();
      if (window.location.search.slice(1) !== capturedQuery) return;
    }

    const targetQuery = serializeStateToQuery(committedState, searchParams);
    canonicalizedTargetQueryRef.current = targetQuery;
    const href =
      targetQuery.length > 0 ? `${pathname}?${targetQuery}` : pathname;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }, [
    needsCanonicalize,
    isPending,
    committedState,
    pathname,
    router,
    searchParams,
  ]);

  // Restore from localStorage whenever the URL becomes clean (no raw
  // params) AND saved state differs from committed default. Fires on
  // first mount AND on any subsequent client-side navigation that
  // lands the component on a clean URL. Idempotent condition checks
  // handle re-runs as no-ops, so there's no need for a one-shot gate.
  //
  // **Pending-commit gate**: if `pendingPersistRef.current !== null`
  // a user's commit is still mid-pipeline. The persist effect runs
  // BEFORE this one in declaration order, so by the time we get
  // here, persist has either written the user's state to storage
  // and cleared the gate, OR cleared it because the transition was
  // superseded. Either way, any non-null value here means the
  // persist effect hasn't had a chance to run yet (different render
  // cycle), in which case we must skip to avoid reading stale
  // storage.
  useEffect(() => {
    if (hasAnyRawParams) return;
    if (pendingPersistRef.current !== null) return;
    if (
      canonicalizedTargetQueryRef.current !== null &&
      canonicalizedTargetQueryRef.current === searchParamsString
    ) {
      // This URL is canonicalization output — don't override it
      // with saved prefs. Clear the target so a later genuine clean
      // navigation (not canonicalization) can still restore.
      canonicalizedTargetQueryRef.current = null;
      return;
    }

    const saved = readPersistedState(validCountryCodes);
    if (!saved || isEqualState(saved, committedState)) return;

    // Drift guard: if window.location.search has changed since the
    // render that scheduled this effect, a user click or external
    // navigation has intervened — the restore is no longer relevant.
    if (typeof window !== "undefined") {
      if (window.location.search.slice(1) !== searchParamsString) return;
    }

    const href = buildFightersHref(pathname, saved, searchParams);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }, [
    hasAnyRawParams,
    committedState,
    validCountryCodes,
    pathname,
    router,
    searchParams,
    searchParamsString,
  ]);

  const regionDisplayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  const countryOptions = useMemo(() => {
    const uniqueCodes = Array.from(validCountryCodes);
    return uniqueCodes
      .map((code) => ({
        code,
        label: getRegionLabel(regionDisplayNames, code),
        flag: items.find((item) => item.nationalityCode === code)?.flag ?? "",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items, validCountryCodes, regionDisplayNames]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeSort = displayState.sortBy;
    const activeCountry = displayState.countryFilter;

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
        const matchesCountry =
          activeCountry === DEFAULT_COUNTRY ||
          fighter.nationalityCode === activeCountry;
        return matchesQuery && matchesCountry;
      });

    if (activeSort === "wins_desc") {
      next.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return a.name.localeCompare(b.name, locale, { sensitivity: "base" });
      });
    } else if (activeSort === "losses_desc") {
      next.sort((a, b) => {
        if (b.losses !== a.losses) return b.losses - a.losses;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.name.localeCompare(b.name, locale, { sensitivity: "base" });
      });
    } else if (activeSort === "winrate_desc") {
      // Win rate = wins / (wins + losses). Draws excluded from the
      // denominator so "10W 0L 5D" scores the same as "10W 0L".
      //
      // Minimum-fights gate: fighters with < 3 decided fights are
      // pushed to the bottom so a 1-0 rookie doesn't outrank a 40-10
      // veteran. The "sort label = raw win rate" contract stays
      // intact for everyone above the gate, which is the honest
      // user-facing semantic per Quality-Maximizing Path. 3 is the
      // minimum to establish a meaningful record in most combat
      // sports federations. Flagged P2 in rounds 4 & 5 of the
      // original 2026-04-12 gpt-review.
      const MIN_DECIDED_FOR_WINRATE = 3;
      next.sort((a, b) => {
        const aDecided = a.wins + a.losses;
        const bDecided = b.wins + b.losses;
        const aQualified = aDecided >= MIN_DECIDED_FOR_WINRATE;
        const bQualified = bDecided >= MIN_DECIDED_FOR_WINRATE;
        if (aQualified !== bQualified) return aQualified ? -1 : 1;
        const aRate = aDecided > 0 ? a.wins / aDecided : -1;
        const bRate = bDecided > 0 ? b.wins / bDecided : -1;
        if (bRate !== aRate) return bRate - aRate;
        if (bDecided !== aDecided) return bDecided - aDecided;
        return a.name.localeCompare(b.name, locale, { sensitivity: "base" });
      });
    } else if (activeSort === "weightclass_asc") {
      // Ascending canonical boxing weight ladder (strawweight →
      // heavy). `getWeightClassOrder` returns `WEIGHT_ORDER.length`
      // for unknown values which naturally pushes them to the bottom.
      next.sort((a, b) => {
        const aOrder = a.weightClass
          ? getWeightClassOrder(a.weightClass)
          : Number.MAX_SAFE_INTEGER;
        const bOrder = b.weightClass
          ? getWeightClassOrder(b.weightClass)
          : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name, locale, { sensitivity: "base" });
      });
    } else {
      // Default name sort: fighters with a pixel-art photo first,
      // then alphabetical by localized name.
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
  }, [displayState.sortBy, displayState.countryFilter, items, locale, query]);

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
            value={displayState.countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className={retroFieldClassName("appearance-none pl-9 pr-9")}
            aria-label={t("fighter.filterCountry")}
          >
            <option value={DEFAULT_COUNTRY}>{t("fighter.allCountries")}</option>
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
            value={displayState.sortBy}
            onChange={(e) => {
              const v = e.target.value;
              if (isSortKey(v)) setSortBy(v);
            }}
            className={retroFieldClassName("appearance-none pl-9 pr-9")}
            aria-label={t("fighter.sortBy")}
          >
            <option value="name_asc">{t("fighter.sortNameAsc")}</option>
            <option value="winrate_desc">{t("fighter.sortWinRateDesc")}</option>
            <option value="weightclass_asc">{t("fighter.sortWeightClassAsc")}</option>
            <option value="wins_desc">{t("fighter.sortWinsDesc")}</option>
            <option value="losses_desc">{t("fighter.sortLossesDesc")}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bp-muted)]" strokeWidth={1.8} />
        </div>
      </div>

      <div
        className={`grid grid-cols-2 gap-2 transition-opacity duration-150 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${
          isPending ? "opacity-70" : "opacity-100"
        }`}
        aria-busy={isPending}
      >
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
              <p className="mt-0.5 flex flex-wrap items-center justify-center gap-x-1 text-xs">
                <WLRecord wins={f.wins} losses={f.losses} size="xs" />
                {f.draws > 0 && <span className="text-[var(--bp-muted)]">{f.draws}D</span>}
                {f.divisionChip ? (
                  <>
                    <span className="text-[var(--bp-muted)]">·</span>
                    {f.divisionChip.weightLabel ? (
                      <span className="text-[var(--bp-muted)]">{f.divisionChip.weightLabel}</span>
                    ) : null}
                    <span
                      className={
                        f.divisionChip.tone === "champion"
                          ? "bg-gradient-to-r from-[#e5a944] via-[#fde68a] to-[#e5a944] bg-clip-text font-semibold text-transparent"
                          : "font-semibold text-[var(--bp-ink)]"
                      }
                    >
                      {f.divisionChip.rankLabel}
                    </span>
                  </>
                ) : f.weightClass ? (
                  <>
                    <span className="text-[var(--bp-muted)]">·</span>
                    <span className="text-[var(--bp-muted)]">{f.weightClass}</span>
                  </>
                ) : null}
              </p>
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
