/**
 * Pure state helpers for the `/fighters` page grid — parsing, validating,
 * serializing, and persisting the URL-driven sort/country-filter state.
 *
 * Framework-agnostic on purpose. `FighterGrid.tsx` hosts all the React
 * hooks + navigation; this file stays pure so every branch of the state
 * machine (empty param / invalid value / explicit default / unknown
 * country / malformed persisted JSON) can be unit-tested without
 * mounting a component or mocking a router.
 *
 * Architecture decided via gpt-review.sh free-form consultation on
 * 2026-04-12 after Branch 4 hit 7 review rounds on the URL-as-state vs
 * local-state question. Quality-Maximizing Path pick: keep the URL as
 * source of truth, split status metadata (raw presence vs canonical),
 * use `useTransition` in the component for optimistic UI. This file
 * owns the split.
 */

export type SortKey =
  | "name_asc"
  | "wins_desc"
  | "losses_desc"
  | "winrate_desc"
  | "weightclass_asc";

export const SORT_KEYS: readonly SortKey[] = [
  "name_asc",
  "wins_desc",
  "losses_desc",
  "winrate_desc",
  "weightclass_asc",
] as const;

export const DEFAULT_SORT: SortKey = "name_asc";
export const DEFAULT_COUNTRY = "all";
export const LOCAL_STORAGE_KEY = "bp:fighters:v1";

export type GridState = {
  sortBy: SortKey;
  countryFilter: string;
};

export type ParamStatus = "missing" | "valid" | "invalid";

export type ParsedGridState = {
  state: GridState;
  meta: {
    sortStatus: ParamStatus;
    wcStatus: ParamStatus;
    /**
     * True if the URL had EITHER `sort` or `wc` in any form — including
     * empty string or unknown value. Gates localStorage restore: a
     * request that explicitly carries any param (even malformed) must
     * not be overridden by personal preferences. Canonicalization — not
     * restore — is the right fix for malformed input.
     */
    hasAnyRawParams: boolean;
    /**
     * True if the URL contains any non-canonical representation of the
     * current state: invalid values, empty strings, OR explicit
     * defaults (e.g. `?sort=name_asc`, `?wc=all`). Canonical URLs omit
     * defaults entirely so bookmarked and shared links round-trip.
     */
    needsCanonicalize: boolean;
  };
};

export function isSortKey(value: string): value is SortKey {
  return (SORT_KEYS as readonly string[]).includes(value);
}

function classifySort(
  raw: string | null,
  isDuplicated: boolean,
): { status: ParamStatus; value: SortKey } {
  // Duplicate params (`?sort=a&sort=b`) are ambiguous — treat as
  // invalid so canonicalization collapses them to a single value.
  if (isDuplicated) return { status: "invalid", value: DEFAULT_SORT };
  if (raw === null) return { status: "missing", value: DEFAULT_SORT };
  if (raw === "") return { status: "invalid", value: DEFAULT_SORT };
  if (isSortKey(raw)) return { status: "valid", value: raw };
  return { status: "invalid", value: DEFAULT_SORT };
}

function classifyCountry(
  raw: string | null,
  isDuplicated: boolean,
  validCountryCodes: ReadonlySet<string>,
): { status: ParamStatus; value: string } {
  if (isDuplicated) return { status: "invalid", value: DEFAULT_COUNTRY };
  if (raw === null) return { status: "missing", value: DEFAULT_COUNTRY };
  if (raw === "") return { status: "invalid", value: DEFAULT_COUNTRY };
  if (raw === DEFAULT_COUNTRY) return { status: "valid", value: DEFAULT_COUNTRY };
  if (validCountryCodes.has(raw)) return { status: "valid", value: raw };
  return { status: "invalid", value: DEFAULT_COUNTRY };
}

export function parseStateFromParams(
  search: URLSearchParams,
  validCountryCodes: ReadonlySet<string>,
): ParsedGridState {
  // `getAll` catches duplicated params which `get`/`has` silently
  // ignore. `?sort=wins_desc&sort=losses_desc` must canonicalize to a
  // single value, not be treated as valid because the first entry
  // happens to be in SORT_KEYS.
  const sortEntries = search.getAll("sort");
  const wcEntries = search.getAll("wc");

  const sortClass = classifySort(
    sortEntries[0] ?? null,
    sortEntries.length > 1,
  );
  const wcClass = classifyCountry(
    wcEntries[0] ?? null,
    wcEntries.length > 1,
    validCountryCodes,
  );

  const hasAnyRawParams = sortEntries.length > 0 || wcEntries.length > 0;

  // Canonical URL = no default values, no invalid values. Explicit
  // defaults (`?sort=name_asc`) round-trip weirdly in shared links, so
  // we strip them too — once a user clicks "name_asc" after having
  // `winrate_desc`, the URL returns to `/fighters` bare.
  const sortIsExplicitDefault =
    sortClass.status === "valid" && sortClass.value === DEFAULT_SORT;
  const wcIsExplicitDefault =
    wcClass.status === "valid" && wcClass.value === DEFAULT_COUNTRY;

  const needsCanonicalize =
    sortClass.status === "invalid" ||
    wcClass.status === "invalid" ||
    sortIsExplicitDefault ||
    wcIsExplicitDefault;

  return {
    state: {
      sortBy: sortClass.value,
      countryFilter: wcClass.value,
    },
    meta: {
      sortStatus: sortClass.status,
      wcStatus: wcClass.status,
      hasAnyRawParams,
      needsCanonicalize,
    },
  };
}

export function isEqualState(a: GridState, b: GridState): boolean {
  return a.sortBy === b.sortBy && a.countryFilter === b.countryFilter;
}

/**
 * Serialize grid state into a query string (without leading `?`).
 * Defaults are omitted. When `baseSearch` is provided, any params that
 * aren't `sort` or `wc` are preserved — that's critical for
 * `?utm=x&sort=...` style links and feature-flag params that live on
 * the same page.
 *
 * Canonical ordering: unrelated params first (in their original
 * order), then `sort`, then `wc`. That makes equality comparisons on
 * serialized strings deterministic across canonicalization passes.
 */
export function serializeStateToQuery(
  state: GridState,
  baseSearch?: URLSearchParams | null,
): string {
  const params = new URLSearchParams();
  if (baseSearch) {
    for (const [key, value] of baseSearch.entries()) {
      if (key !== "sort" && key !== "wc") {
        params.append(key, value);
      }
    }
  }
  if (state.sortBy !== DEFAULT_SORT) params.set("sort", state.sortBy);
  if (state.countryFilter !== DEFAULT_COUNTRY) params.set("wc", state.countryFilter);
  return params.toString();
}

/**
 * Build a canonical href for the grid state. `baseSearch` preserves
 * unrelated query params (utm, feature flags, etc) — always pass the
 * current `useSearchParams()` result to avoid silently stripping them
 * on sort/filter changes.
 */
export function buildFightersHref(
  pathname: string,
  state: GridState,
  baseSearch?: URLSearchParams | null,
): string {
  const q = serializeStateToQuery(state, baseSearch);
  return q.length > 0 ? `${pathname}?${q}` : pathname;
}

/**
 * Read and validate persisted preferences. Returns `null` when the
 * store is empty, malformed, or identical to the defaults (no point
 * restoring a no-op). Unknown country codes are silently clamped to
 * `"all"` rather than discarding the sort half of the record.
 *
 * `typeof window` guard keeps this safe to call during SSR — although
 * `FighterGrid` only calls it from a mount effect, this is the kind of
 * helper that grows extra callers later and the cheap guard prevents a
 * future ReferenceError.
 */
export function readPersistedState(
  validCountryCodes: ReadonlySet<string>,
): GridState | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as { sort?: unknown; country?: unknown };

  const sortBy =
    typeof obj.sort === "string" && isSortKey(obj.sort) ? obj.sort : DEFAULT_SORT;

  let countryFilter: string = DEFAULT_COUNTRY;
  if (typeof obj.country === "string") {
    if (obj.country === DEFAULT_COUNTRY || validCountryCodes.has(obj.country)) {
      countryFilter = obj.country;
    }
  }

  if (sortBy === DEFAULT_SORT && countryFilter === DEFAULT_COUNTRY) return null;
  return { sortBy, countryFilter };
}

/**
 * Persist state to localStorage. When the state is pure defaults we
 * remove the key instead of writing a `{name_asc, all}` record — that
 * keeps `readPersistedState` symmetric (it already returns null for
 * default-only records) and avoids cluttering storage with no-ops.
 */
export function writePersistedState(state: GridState): void {
  if (typeof window === "undefined") return;
  try {
    if (
      state.sortBy === DEFAULT_SORT &&
      state.countryFilter === DEFAULT_COUNTRY
    ) {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ sort: state.sortBy, country: state.countryFilter }),
    );
  } catch {
    // private browsing / quota exceeded — URL state still works, so
    // losing persistence is an acceptable degradation.
  }
}
