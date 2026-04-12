import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_COUNTRY,
  DEFAULT_SORT,
  LOCAL_STORAGE_KEY,
  buildFightersHref,
  isEqualState,
  isSortKey,
  parseStateFromParams,
  readPersistedState,
  serializeStateToQuery,
  writePersistedState,
} from "./fighter-grid-state";

const VALID_COUNTRIES = new Set(["US", "KR", "JP", "GB"]);

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("isSortKey", () => {
  it("accepts every canonical sort key", () => {
    for (const key of [
      "name_asc",
      "wins_desc",
      "losses_desc",
      "winrate_desc",
      "weightclass_asc",
    ]) {
      expect(isSortKey(key)).toBe(true);
    }
  });

  it("rejects unknown strings and empty values", () => {
    for (const key of ["", "garbage", "NAME_ASC", "winrate", "name-asc"]) {
      expect(isSortKey(key)).toBe(false);
    }
  });
});

describe("parseStateFromParams", () => {
  it("returns defaults when URL is clean", () => {
    const r = parseStateFromParams(params(""), VALID_COUNTRIES);
    expect(r.state).toEqual({ sortBy: DEFAULT_SORT, countryFilter: DEFAULT_COUNTRY });
    expect(r.meta.sortStatus).toBe("missing");
    expect(r.meta.wcStatus).toBe("missing");
    expect(r.meta.hasAnyRawParams).toBe(false);
    expect(r.meta.needsCanonicalize).toBe(false);
  });

  it("parses valid sort + wc", () => {
    const r = parseStateFromParams(
      params("sort=winrate_desc&wc=US"),
      VALID_COUNTRIES,
    );
    expect(r.state).toEqual({ sortBy: "winrate_desc", countryFilter: "US" });
    expect(r.meta.sortStatus).toBe("valid");
    expect(r.meta.wcStatus).toBe("valid");
    expect(r.meta.hasAnyRawParams).toBe(true);
    expect(r.meta.needsCanonicalize).toBe(false);
  });

  it("flags empty ?wc= as invalid AND hasAnyRawParams (fix for round-7 P2)", () => {
    // The original parked version treated empty `?wc=` as valid URL
    // state, which suppressed localStorage restore AND skipped
    // canonicalization — leaving the dead param sticky and wiping
    // saved prefs on every mount.
    const r = parseStateFromParams(params("wc="), VALID_COUNTRIES);
    expect(r.state.countryFilter).toBe(DEFAULT_COUNTRY);
    expect(r.meta.wcStatus).toBe("invalid");
    expect(r.meta.hasAnyRawParams).toBe(true);
    expect(r.meta.needsCanonicalize).toBe(true);
  });

  it("flags empty ?sort= as invalid", () => {
    const r = parseStateFromParams(params("sort="), VALID_COUNTRIES);
    expect(r.state.sortBy).toBe(DEFAULT_SORT);
    expect(r.meta.sortStatus).toBe("invalid");
    expect(r.meta.needsCanonicalize).toBe(true);
  });

  it("flags unknown sort values as invalid", () => {
    const r = parseStateFromParams(params("sort=garbage"), VALID_COUNTRIES);
    expect(r.state.sortBy).toBe(DEFAULT_SORT);
    expect(r.meta.sortStatus).toBe("invalid");
    expect(r.meta.needsCanonicalize).toBe(true);
  });

  it("flags unknown country codes as invalid", () => {
    const r = parseStateFromParams(params("wc=XYZ"), VALID_COUNTRIES);
    expect(r.state.countryFilter).toBe(DEFAULT_COUNTRY);
    expect(r.meta.wcStatus).toBe("invalid");
    expect(r.meta.needsCanonicalize).toBe(true);
  });

  it("accepts the literal `all` as a valid country value", () => {
    const r = parseStateFromParams(params("wc=all"), VALID_COUNTRIES);
    expect(r.state.countryFilter).toBe(DEFAULT_COUNTRY);
    expect(r.meta.wcStatus).toBe("valid");
    // …but flags it for canonicalization since `all` is the default
    expect(r.meta.needsCanonicalize).toBe(true);
  });

  it("marks explicit default sort as needing canonicalization", () => {
    const r = parseStateFromParams(params("sort=name_asc"), VALID_COUNTRIES);
    expect(r.state.sortBy).toBe("name_asc");
    expect(r.meta.sortStatus).toBe("valid");
    expect(r.meta.needsCanonicalize).toBe(true);
  });

  it("accepts a partial URL (only sort, no wc)", () => {
    const r = parseStateFromParams(
      params("sort=weightclass_asc"),
      VALID_COUNTRIES,
    );
    expect(r.state).toEqual({
      sortBy: "weightclass_asc",
      countryFilter: DEFAULT_COUNTRY,
    });
    expect(r.meta.sortStatus).toBe("valid");
    expect(r.meta.wcStatus).toBe("missing");
    expect(r.meta.hasAnyRawParams).toBe(true);
    expect(r.meta.needsCanonicalize).toBe(false);
  });

  it("accepts a partial URL (only wc, no sort)", () => {
    const r = parseStateFromParams(params("wc=KR"), VALID_COUNTRIES);
    expect(r.state).toEqual({ sortBy: DEFAULT_SORT, countryFilter: "KR" });
    expect(r.meta.wcStatus).toBe("valid");
    expect(r.meta.sortStatus).toBe("missing");
    expect(r.meta.needsCanonicalize).toBe(false);
  });

  it("treats empty validCountryCodes set consistently", () => {
    const r = parseStateFromParams(params("wc=US"), new Set());
    expect(r.state.countryFilter).toBe(DEFAULT_COUNTRY);
    expect(r.meta.wcStatus).toBe("invalid");
    expect(r.meta.needsCanonicalize).toBe(true);
  });

  it("flags duplicated sort params as invalid (fix for round-2 P3)", () => {
    const r = parseStateFromParams(
      params("sort=wins_desc&sort=losses_desc"),
      VALID_COUNTRIES,
    );
    expect(r.state.sortBy).toBe(DEFAULT_SORT);
    expect(r.meta.sortStatus).toBe("invalid");
    expect(r.meta.needsCanonicalize).toBe(true);
  });

  it("flags duplicated wc params as invalid", () => {
    const r = parseStateFromParams(params("wc=US&wc=KR"), VALID_COUNTRIES);
    expect(r.state.countryFilter).toBe(DEFAULT_COUNTRY);
    expect(r.meta.wcStatus).toBe("invalid");
    expect(r.meta.needsCanonicalize).toBe(true);
  });

  it("handles duplicated sort where first value is valid", () => {
    // Even if the first value is valid, duplicates are ambiguous
    // and must canonicalize to a single entry.
    const r = parseStateFromParams(
      params("sort=wins_desc&sort=garbage"),
      VALID_COUNTRIES,
    );
    expect(r.state.sortBy).toBe(DEFAULT_SORT);
    expect(r.meta.sortStatus).toBe("invalid");
    expect(r.meta.needsCanonicalize).toBe(true);
  });
});

describe("isEqualState", () => {
  it("compares by value, not reference", () => {
    expect(
      isEqualState(
        { sortBy: "winrate_desc", countryFilter: "US" },
        { sortBy: "winrate_desc", countryFilter: "US" },
      ),
    ).toBe(true);
  });

  it("detects sort differences", () => {
    expect(
      isEqualState(
        { sortBy: "winrate_desc", countryFilter: "US" },
        { sortBy: "name_asc", countryFilter: "US" },
      ),
    ).toBe(false);
  });

  it("detects country differences", () => {
    expect(
      isEqualState(
        { sortBy: "winrate_desc", countryFilter: "US" },
        { sortBy: "winrate_desc", countryFilter: "KR" },
      ),
    ).toBe(false);
  });
});

describe("serializeStateToQuery / buildFightersHref", () => {
  it("omits defaults entirely", () => {
    expect(
      serializeStateToQuery({ sortBy: DEFAULT_SORT, countryFilter: DEFAULT_COUNTRY }),
    ).toBe("");
  });

  it("omits only the default half when the other is set", () => {
    expect(
      serializeStateToQuery({ sortBy: "winrate_desc", countryFilter: DEFAULT_COUNTRY }),
    ).toBe("sort=winrate_desc");
    expect(
      serializeStateToQuery({ sortBy: DEFAULT_SORT, countryFilter: "US" }),
    ).toBe("wc=US");
  });

  it("serializes sort first, then wc when no base", () => {
    expect(
      serializeStateToQuery({ sortBy: "winrate_desc", countryFilter: "KR" }),
    ).toBe("sort=winrate_desc&wc=KR");
  });

  it("preserves unrelated params from baseSearch (fix for round-2 P2)", () => {
    const base = new URLSearchParams("utm=x&flag=beta");
    expect(
      serializeStateToQuery(
        { sortBy: "winrate_desc", countryFilter: "US" },
        base,
      ),
    ).toBe("utm=x&flag=beta&sort=winrate_desc&wc=US");
  });

  it("preserves unrelated params even when grid state is default", () => {
    const base = new URLSearchParams("utm=x");
    expect(
      serializeStateToQuery(
        { sortBy: DEFAULT_SORT, countryFilter: DEFAULT_COUNTRY },
        base,
      ),
    ).toBe("utm=x");
  });

  it("strips old sort/wc from baseSearch and replaces with canonical values", () => {
    const base = new URLSearchParams("sort=garbage&utm=x&wc=XYZ");
    expect(
      serializeStateToQuery(
        { sortBy: "winrate_desc", countryFilter: "US" },
        base,
      ),
    ).toBe("utm=x&sort=winrate_desc&wc=US");
  });

  it("strips old sort/wc from baseSearch when new state is default", () => {
    // Canonicalization from `/fighters?sort=garbage&utm=x` should
    // collapse to `/fighters?utm=x`, preserving the unrelated param
    // while cleaning up the dirty sort.
    const base = new URLSearchParams("sort=garbage&utm=x");
    expect(
      serializeStateToQuery(
        { sortBy: DEFAULT_SORT, countryFilter: DEFAULT_COUNTRY },
        base,
      ),
    ).toBe("utm=x");
  });

  it("handles duplicated sort/wc in baseSearch via URLSearchParams.set replacement", () => {
    // URLSearchParams.set replaces all existing entries with a single
    // one, so duplicated base entries collapse correctly.
    const base = new URLSearchParams("sort=a&sort=b&utm=keep");
    expect(
      serializeStateToQuery(
        { sortBy: "winrate_desc", countryFilter: DEFAULT_COUNTRY },
        base,
      ),
    ).toBe("utm=keep&sort=winrate_desc");
  });

  it("buildFightersHref returns bare pathname when state is default and no base", () => {
    expect(
      buildFightersHref("/en/fighters", {
        sortBy: DEFAULT_SORT,
        countryFilter: DEFAULT_COUNTRY,
      }),
    ).toBe("/en/fighters");
  });

  it("buildFightersHref appends the query when state is non-default", () => {
    expect(
      buildFightersHref("/en/fighters", {
        sortBy: "winrate_desc",
        countryFilter: "US",
      }),
    ).toBe("/en/fighters?sort=winrate_desc&wc=US");
  });

  it("buildFightersHref preserves unrelated params", () => {
    const base = new URLSearchParams("utm=tw");
    expect(
      buildFightersHref(
        "/en/fighters",
        { sortBy: "winrate_desc", countryFilter: "US" },
        base,
      ),
    ).toBe("/en/fighters?utm=tw&sort=winrate_desc&wc=US");
  });
});

describe("readPersistedState", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    const store = new Map<string, string>();
    // Minimal localStorage shim — vitest node env doesn't have one.
    const localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
    (globalThis as unknown as { window: { localStorage: typeof localStorage } }).window = {
      localStorage,
    };
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as unknown as Record<string, unknown>).window;
    } else {
      (globalThis as unknown as { window: unknown }).window = originalWindow;
    }
  });

  it("returns null when the store is empty", () => {
    expect(readPersistedState(VALID_COUNTRIES)).toBeNull();
  });

  it("returns null when the stored value is default-only", () => {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ sort: DEFAULT_SORT, country: DEFAULT_COUNTRY }),
    );
    expect(readPersistedState(VALID_COUNTRIES)).toBeNull();
  });

  it("returns the stored state when valid and non-default", () => {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ sort: "winrate_desc", country: "US" }),
    );
    expect(readPersistedState(VALID_COUNTRIES)).toEqual({
      sortBy: "winrate_desc",
      countryFilter: "US",
    });
  });

  it("clamps unknown country to 'all' but keeps valid sort", () => {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ sort: "winrate_desc", country: "ZZ" }),
    );
    expect(readPersistedState(VALID_COUNTRIES)).toEqual({
      sortBy: "winrate_desc",
      countryFilter: DEFAULT_COUNTRY,
    });
  });

  it("coerces unknown sort to default but keeps valid country", () => {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ sort: "garbage", country: "US" }),
    );
    expect(readPersistedState(VALID_COUNTRIES)).toEqual({
      sortBy: DEFAULT_SORT,
      countryFilter: "US",
    });
  });

  it("returns null when JSON is malformed", () => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, "not-json {");
    expect(readPersistedState(VALID_COUNTRIES)).toBeNull();
  });

  it("returns null when JSON is not an object", () => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, '"string"');
    expect(readPersistedState(VALID_COUNTRIES)).toBeNull();
  });

  it("returns null when getItem throws (private browsing)", () => {
    const getItem = vi
      .spyOn(window.localStorage, "getItem")
      .mockImplementation(() => {
        throw new Error("SecurityError");
      });
    expect(readPersistedState(VALID_COUNTRIES)).toBeNull();
    getItem.mockRestore();
  });
});

describe("writePersistedState", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
    (globalThis as unknown as { window: { localStorage: typeof localStorage } }).window = {
      localStorage,
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as Record<string, unknown>).window;
  });

  it("writes state as JSON with stable key shape", () => {
    writePersistedState({ sortBy: "winrate_desc", countryFilter: "KR" });
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({ sort: "winrate_desc", country: "KR" });
  });

  it("removes the key when state is pure defaults (no wasted storage)", () => {
    // Seed with a non-default value
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ sort: "winrate_desc", country: "US" }),
    );
    writePersistedState({
      sortBy: DEFAULT_SORT,
      countryFilter: DEFAULT_COUNTRY,
    });
    expect(window.localStorage.getItem(LOCAL_STORAGE_KEY)).toBeNull();
  });

  it("swallows setItem errors so the UI keeps working", () => {
    const setItem = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    expect(() =>
      writePersistedState({ sortBy: "winrate_desc", countryFilter: "US" }),
    ).not.toThrow();
    setItem.mockRestore();
  });
});
