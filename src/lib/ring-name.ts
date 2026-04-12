export const RING_NAME_MIN_LENGTH = 3;
export const RING_NAME_MAX_LENGTH = 20;

const RING_NAME_PATTERN = /^[\p{L}\p{N} _-]+$/u;

/**
 * Escape `%`, `_`, and `\` so a string can be passed to a Postgres
 * `ILIKE` pattern as a literal. Ring names allow `_` as a valid
 * character (see `RING_NAME_PATTERN`), and `_` is also a single-char
 * wildcard in `ILIKE` — without this escape, the share-page lookup
 * `ilike("ring_name", "a_b")` would silently match "acb", "a1b", etc.
 *
 * Used by callers that need exact case-insensitive equality but are
 * stuck on PostgREST's `.ilike()` because it cannot express
 * `lower(col) = lower(?)` without an RPC. The Postgres LIKE escape
 * character is `\` by default, which PostgREST forwards as-is.
 */
export function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export type RingNameValidationError =
  | "too_short"
  | "too_long"
  | "invalid_characters";

export function normalizeRingName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function getRingNameValidationError(value: string): RingNameValidationError | null {
  const normalized = normalizeRingName(value);

  if (normalized.length < RING_NAME_MIN_LENGTH) {
    return "too_short";
  }

  if (normalized.length > RING_NAME_MAX_LENGTH) {
    return "too_long";
  }

  if (!RING_NAME_PATTERN.test(normalized)) {
    return "invalid_characters";
  }

  return null;
}

function trimBaseForSuffix(base: string, suffix: string) {
  const maxBaseLength = Math.max(1, RING_NAME_MAX_LENGTH - suffix.length);
  return normalizeRingName(base.slice(0, maxBaseLength));
}

export function buildRingNameSuggestions(value: string) {
  const normalized = normalizeRingName(value);
  const stripped = normalizeRingName(normalized.replace(/(?:[\s_-]*\d+)+$/u, ""));
  const base = stripped.length >= RING_NAME_MIN_LENGTH ? stripped : normalized;
  const suffixes = [" 01", " 77", " KO", " R1", "_IQ", "-X"];

  return Array.from(
    new Set(
      suffixes
        .map((suffix) => normalizeRingName(`${trimBaseForSuffix(base, suffix)}${suffix}`))
        .filter((candidate) => {
          if (candidate.toLowerCase() === normalized.toLowerCase()) {
            return false;
          }

          return getRingNameValidationError(candidate) === null;
        })
    )
  );
}
