/**
 * Pre-launch seed/test events stay in the DB forever — users'
 * prediction history, fighter records, and share-page permalinks
 * all reference them. Hiding those rows at the row level would
 * silently erase past picks, break `/my-record`, and corrupt
 * fighter win/loss counts.
 *
 * Instead, we gate visibility only at the user-facing DISCOVERY
 * surfaces: the home page's featured selector + event list, the
 * ranking page's "By Event" picker, and the DevPanel picker.
 * Everything else — direct `/events/[id]` URLs, `/my-record/*`,
 * share pages, dashboard aggregates, `/fighters/[id]` records,
 * `admin/*` — continues to see the full event set.
 *
 * 2026-04-17 Sean: the first real-world BlackPick event is
 * "블랙컴뱃 16: EXODUS" on 2026-01-31. Events dated earlier are
 * carried-over dev fixtures, and their scores/results can be
 * noisy or wrong — surfacing them in discovery gives users the
 * wrong impression of what's "current".
 */
export const EXODUS_ANCHOR_DATE = "2026-01-31";

/**
 * True when the event should appear on user-facing discovery
 * surfaces. Inclusive of the anchor date itself — Exodus is
 * the first real event, not excluded from its own filter.
 *
 * Accepts any object shape that carries a YYYY-MM-DD `date`
 * string. Comparison is lexicographic, which is safe because
 * our `events.date` column is always ISO-day-precision.
 */
export function isUserVisibleEvent(event: { date: string }): boolean {
  return event.date >= EXODUS_ANCHOR_DATE;
}

/**
 * Returns a new array with pre-Exodus entries removed. Original
 * array is untouched. Safe to chain with other filters.
 */
export function filterUserVisibleEvents<T extends { date: string }>(
  events: readonly T[],
): T[] {
  return events.filter(isUserVisibleEvent);
}
