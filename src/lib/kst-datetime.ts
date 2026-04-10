/**
 * BlackPick venue is Black Agora in Seoul, so every fight start time is
 * authored in Korea Standard Time regardless of where the admin sits when
 * creating the fight. Centralizing parsing here avoids the classic
 * `new Date(naiveString).toISOString()` pitfall, which silently anchors the
 * naive string to the admin's browser timezone.
 *
 * Korea does not observe DST, so a fixed UTC+9 offset is safe.
 */

const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const KST_OFFSET_HOURS = 9;

/**
 * Parse a `<input type="datetime-local">` value (naive wall clock) as Korea
 * time and return the equivalent UTC ISO string.
 *
 * Throws when the input does not match the datetime-local format OR when
 * the component fields are out of range (e.g. month 99, day 31 in February).
 * `Date.UTC` happily normalizes out-of-range components into a valid
 * instant, which would silently corrupt data — so we range-check each
 * component first, build the UTC instant, and then round-trip the Korea
 * wall-clock fields to verify the date we get back matches what the caller
 * asked for.
 */
export function parseKstDatetimeLocalToUtcIso(input: string): string {
  const match = input.match(DATETIME_LOCAL_RE);
  if (!match) {
    throw new Error(`Invalid datetime-local value: ${input}`);
  }
  const [, yStr, moStr, dStr, hStr, miStr, sStr = "0"] = match;
  const year = Number(yStr);
  const month = Number(moStr);
  const day = Number(dStr);
  const hour = Number(hStr);
  const minute = Number(miStr);
  const second = Number(sStr);

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month in datetime-local: ${input}`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid day in datetime-local: ${input}`);
  }
  if (hour < 0 || hour > 23) {
    throw new Error(`Invalid hour in datetime-local: ${input}`);
  }
  if (minute < 0 || minute > 59) {
    throw new Error(`Invalid minute in datetime-local: ${input}`);
  }
  if (second < 0 || second > 59) {
    throw new Error(`Invalid second in datetime-local: ${input}`);
  }

  const utcMs = Date.UTC(
    year,
    month - 1,
    day,
    hour - KST_OFFSET_HOURS,
    minute,
    second,
  );

  // Round-trip check: convert the UTC instant back to its Korea wall-clock
  // and confirm every component matches the input. This rejects dates like
  // "2026-02-31" that `Date.UTC` silently rolls forward to March.
  const roundTrip = new Date(utcMs + KST_OFFSET_HOURS * 60 * 60 * 1000);
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day ||
    roundTrip.getUTCHours() !== hour ||
    roundTrip.getUTCMinutes() !== minute ||
    roundTrip.getUTCSeconds() !== second
  ) {
    throw new Error(`Invalid calendar date in datetime-local: ${input}`);
  }

  return new Date(utcMs).toISOString();
}

/**
 * Given a UTC ISO timestamp, return the Korea-local calendar date (YYYY-MM-DD).
 * Used to cross-check `fights.start_time` against the parent `events.date`
 * column, which is a `DATE` column representing the Korea-local event day.
 */
export function utcIsoToKstDateString(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO timestamp: ${iso}`);
  }
  const kstMs = date.getTime() + KST_OFFSET_HOURS * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format a UTC ISO timestamp as a Korea-local wall clock string the admin
 * can double-check visually before committing (e.g. "2026-04-11 15:00 KST").
 */
export function formatKstPreview(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const kstMs = date.getTime() + KST_OFFSET_HOURS * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  const hour = String(kst.getUTCHours()).padStart(2, "0");
  const minute = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} KST`;
}
