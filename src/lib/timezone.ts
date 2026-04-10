/**
 * Timezone detection, formatting, and user-preference persistence for the
 * timer/time label on event pages. Keeps all Intl / localStorage concerns in
 * one place so components can stay dumb.
 */

const STORAGE_KEY = "bp_user_timezone";

/**
 * Curated market-specific fallback list, used when the runtime does not
 * expose `Intl.supportedValuesOf('timeZone')`. Ordered roughly by the
 * locales BlackPick ships for (ko/ja/zh-CN/mn/en/es/pt-BR) so the first
 * items are the most likely to be useful.
 */
const FALLBACK_TIMEZONES: readonly string[] = [
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Taipei",
  "Asia/Ulaanbaatar",
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Jakarta",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Pacific/Auckland",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Mexico_City",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

/**
 * Detect the viewer's IANA timezone via Intl. Falls back to "UTC" if Intl
 * is unavailable or the runtime returns something unexpected — better to
 * ship a clearly labelled UTC time than to silently display a wrong local.
 */
export function detectUserTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof detected === "string" && detected.length > 0) {
      return detected;
    }
  } catch {
    // Intl not available — fall through.
  }
  return "UTC";
}

/**
 * Full IANA list if the runtime exposes it, otherwise the curated fallback.
 * `Intl.supportedValuesOf('timeZone')` landed in Node 18 / Chrome 99 /
 * Safari 15.4 so modern browsers will get the complete list. The runtime
 * returns canonical ids (e.g. "Etc/UTC") so we also guarantee "UTC" is
 * present for a friendlier dropdown label.
 */
export function getAllTimezones(): readonly string[] {
  try {
    const supported = (
      Intl as unknown as {
        supportedValuesOf?: (key: string) => string[];
      }
    ).supportedValuesOf?.("timeZone");
    if (Array.isArray(supported) && supported.length > 0) {
      return supported.includes("UTC") ? supported : ["UTC", ...supported];
    }
  } catch {
    // Older runtime — use the curated list.
  }
  return FALLBACK_TIMEZONES;
}

/** Deduplicated set of zones commonly useful to BlackPick users. */
export function getCommonTimezones(): readonly string[] {
  return FALLBACK_TIMEZONES;
}

/**
 * Build the dropdown ordering: detected zone first (always pinned, even if
 * it's also in the common list), then Asia/Seoul (venue), then the rest of
 * the common set de-duped.
 */
export function buildPreferredTimezoneList(detected: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (tz: string) => {
    if (!seen.has(tz)) {
      seen.add(tz);
      out.push(tz);
    }
  };
  push(detected);
  push("Asia/Seoul");
  for (const tz of FALLBACK_TIMEZONES) push(tz);
  return out;
}

/**
 * Format a UTC ISO timestamp in the given timezone and locale. Always uses
 * explicit `timeZone` so output never silently depends on the host.
 */
export function formatTimeInTimezone(
  iso: string,
  timeZone: string,
  locale = "en",
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }).format(new Date(iso));
  } catch {
    // Fall back to ISO if the runtime chokes on the timezone string.
    return iso;
  }
}

/**
 * Human-friendly label for a timezone, localized when `Intl.DisplayNames`
 * supports it. Falls back to the IANA identifier itself, which is still
 * recognizable (e.g. "Asia/Seoul").
 */
export function getTimezoneDisplayName(
  timeZone: string,
  locale = "en",
): string {
  // City portion of "Area/City" reads better in a dropdown label than the
  // raw IANA id, especially alongside a localized region name.
  const city = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
  try {
    const dn = new Intl.DisplayNames([locale], { type: "region" });
    // IANA zone ids don't expose region codes directly, so we use the city
    // fallback and append any runtime-provided long-form description via
    // `formatToParts`'s `timeZoneName` field.
    const longName = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: "long",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    if (longName && longName !== timeZone) {
      return `${city} · ${longName}`;
    }
    // Suppress unused-variable warnings for dn even though we fell through.
    void dn;
  } catch {
    // Ignore — return the city fallback below.
  }
  return city;
}

/**
 * Short tz abbreviation ("KST", "AEST"). Best-effort — not guaranteed to be
 * unambiguous across locales, so only use it as supplemental text next to
 * the dropdown label, not as the primary identifier.
 */
export function getTimezoneAbbreviation(
  timeZone: string,
  locale = "en",
): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** Read the user's saved timezone preference from localStorage. */
export function loadStoredTimezone(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Persist the user's timezone preference to localStorage. */
export function saveStoredTimezone(timeZone: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, timeZone);
  } catch {
    // Ignore — private browsing / quota — the selection still applies for
    // the current session via component state.
  }
}
