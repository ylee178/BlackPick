export const RING_NAME_MIN_LENGTH = 3;
export const RING_NAME_MAX_LENGTH = 20;

const RING_NAME_PATTERN = /^[\p{L}\p{N} _-]+$/u;

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
