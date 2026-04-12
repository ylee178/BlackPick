"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useClockTick } from "@/lib/use-sync-store";

/**
 * Invisible client component that triggers a server re-render the
 * moment any upcoming fight on the page crosses its lock time.
 *
 * Why it exists
 * -------------
 * `hasStarted` / `displayState` / the "prediction locked" label are
 * all computed on the SERVER at render time from `Date.now()`. Without
 * something kicking the client, the UI stays frozen at the server
 * snapshot — a user watching the timer hit 0 would still see the
 * fight in "upcoming" state, the interactive picker still rendered,
 * and the "locked" label missing, until they manually reload or the
 * next navigation happens.
 *
 * This component closes the gap without turning `FightCard` (and the
 * whole fight list) into a client component. It subscribes to the
 * shared 1Hz `useClockTick` store, watches for any not-yet-elapsed
 * lock timestamp in its prop list, and calls `router.refresh()` when
 * one passes. The router.refresh() re-renders the server component
 * tree with fresh `hasStarted` values, which flips the UI to the
 * correct locked state and causes `lockTimestamps` to shrink because
 * the transitioned fight is no longer upcoming.
 *
 * Retry semantics
 * ---------------
 * We rate-limit refresh calls to once per 10 seconds. Two reasons:
 *   1. If `router.refresh()` fails transparently (network glitch,
 *      aborted fetch, offline), the current render still has stale
 *      `lockTimestamps` and the next tick would re-fire immediately
 *      in a tight loop. The 10s floor prevents spamming.
 *   2. If `router.refresh()` succeeds, the new server props remove
 *      the transitioned timestamp from `lockTimestamps`. The watcher
 *      sees the shorter list, notices nothing else is past-due, and
 *      naturally idles. No explicit "fired" set needed — the prop
 *      change is the source of truth.
 *
 * A previous revision used a `firedForRef: Set<number>` dedup that
 * marked timestamps as fired before the refresh was known to have
 * produced fresh props. On a transient refresh failure that burned
 * the timestamp forever and the page stayed stale past lock until a
 * manual navigation — flagged as a P2 in the 2026-04-12 fix review.
 * Using prop-driven reset plus a rate-limit ref avoids both the spam
 * loop and the stuck-stale failure mode.
 */
type Props = {
  /** Unix epoch milliseconds for each upcoming fight start time. */
  lockTimestamps: number[];
};

const REFRESH_MIN_INTERVAL_MS = 10_000;

export default function LockTransitionWatcher({ lockTimestamps }: Props) {
  const router = useRouter();
  const now = useClockTick();
  const lastRefreshAtRef = useRef<number>(0);

  useEffect(() => {
    if (now === 0) return; // SSR / first paint — skip
    if (lockTimestamps.length === 0) return;

    // Any timestamp past-due? We don't need to pick a specific one —
    // a single refresh is enough to pull in fresh server props for
    // every fight that has transitioned since last render.
    const hasElapsed = lockTimestamps.some((ts) => now >= ts);
    if (!hasElapsed) return;

    // Rate-limit: if we've refreshed within the last 10s, wait. This
    // prevents a tight loop when router.refresh() is slow / silently
    // failing while `now` keeps ticking.
    if (now - lastRefreshAtRef.current < REFRESH_MIN_INTERVAL_MS) return;

    lastRefreshAtRef.current = now;
    router.refresh();
  }, [now, lockTimestamps, router]);

  return null;
}
