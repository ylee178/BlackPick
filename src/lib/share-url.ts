/**
 * Shareable URL helpers for a user's event predictions.
 *
 * URL shape: `/p/{username}/{eventShortId}`
 *  - `username` = the user's ring name, URL-encoded. Matched case-insensitively
 *    on lookup so casing differences in the link do not 404.
 *  - `eventShortId` = the first 10 chars of the event UUID. With 10 hex chars
 *    the collision probability across the entire BlackPick event catalog is
 *    negligible; the lookup uses a prefix match and rejects ambiguous hits.
 *
 * This shape is deliberately short, brand-forward (`/p/` = "pick"), and not
 * scammy — no random hashes, no query-string tokens, no tracking noise.
 */

const EVENT_SHORT_ID_LENGTH = 10;

export function getEventShortId(eventId: string): string {
  return eventId.slice(0, EVENT_SHORT_ID_LENGTH);
}

/** Build the relative share path. Does not include origin or locale. */
export function buildSharePath(ringName: string, eventId: string): string {
  const username = encodeURIComponent(ringName);
  return `/p/${username}/${getEventShortId(eventId)}`;
}

/**
 * Build an absolute share URL.
 * - On the server, pass an explicit `origin` (e.g., from env or request headers).
 * - On the client, omit `origin` to read from `window.location.origin`.
 */
export function buildShareUrl(
  ringName: string,
  eventId: string,
  origin?: string,
): string {
  const path = buildSharePath(ringName, eventId);
  if (origin) return `${origin}${path}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  // Server-rendered fallback — callers should pass origin explicitly.
  return path;
}

/**
 * Guard used by the page route to validate the `eventShortId` segment before
 * hitting the database. Must match exactly what `getEventShortId()` emits:
 * 10 lowercase hex characters (the first 10 of a Supabase UUID). Anything
 * else is rejected as an invalid link — we do not try to be clever about
 * legacy formats or user-entered prefixes.
 */
export function isValidEventShortId(value: string): boolean {
  return new RegExp(`^[0-9a-f]{${EVENT_SHORT_ID_LENGTH}}$`).test(value);
}
