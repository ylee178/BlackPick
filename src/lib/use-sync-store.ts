"use client";

import { useSyncExternalStore } from "react";

/**
 * useSyncExternalStore-based helpers that replace the legacy
 * `useEffect(() => setMounted(true), [])` hydration pattern. The new React
 * hooks lint rule `react-hooks/set-state-in-effect` flags direct setState
 * inside an effect body because it forces an extra cascading render; these
 * helpers move that work into an external store so `getServerSnapshot` and
 * `getSnapshot` carry the SSR vs client distinction without a setState hop.
 */

// ── useIsMounted ──────────────────────────────────────────────────────────

const MOUNT_SERVER = false;
const MOUNT_CLIENT = true;
// Static no-op subscribe: the value never changes on the client after mount,
// so we never need to notify. React only calls getSnapshot once per render.
const noopSubscribe = () => () => {};

/**
 * Returns `false` during SSR and the very first client render, then `true`
 * for every subsequent render. Use this as a replacement for the
 * `useEffect(() => setMounted(true), [])` pattern when you need to gate on
 * "are we running in the browser yet" — e.g. to defer a `createPortal` call
 * until `document` exists.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => MOUNT_CLIENT,
    () => MOUNT_SERVER,
  );
}

// ── useClockTick (shared 1Hz ticker) ─────────────────────────────────────

type Listener = () => void;

let tickValue = 0;
let tickInterval: ReturnType<typeof setInterval> | null = null;
const tickListeners = new Set<Listener>();

function ensureTicker(): void {
  if (tickInterval !== null) return;
  tickValue = Date.now();
  tickInterval = setInterval(() => {
    tickValue = Date.now();
    for (const listener of tickListeners) listener();
  }, 1000);
}

function stopTickerIfIdle(): void {
  if (tickInterval !== null && tickListeners.size === 0) {
    clearInterval(tickInterval);
    tickInterval = null;
    tickValue = 0;
  }
}

function subscribeClock(listener: Listener): () => void {
  tickListeners.add(listener);
  ensureTicker();
  return () => {
    tickListeners.delete(listener);
    stopTickerIfIdle();
  };
}

function getClockSnapshot(): number {
  return tickValue;
}

function getClockServerSnapshot(): number {
  return 0;
}

/**
 * Shared 1Hz wall-clock ticker. Returns `Date.now()` on every tick and `0`
 * during SSR. A single setInterval is shared across all subscribers, so
 * mounting N countdown components still only fires one timer per second.
 *
 * The `0` server snapshot doubles as a "not yet mounted" sentinel — once
 * the first client render subscribes, the ticker starts and the next
 * snapshot returns a real millisecond value, which React picks up as a
 * changed store value and re-renders without ever needing a setState call
 * inside an effect.
 */
export function useClockTick(): number {
  return useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getClockServerSnapshot,
  );
}
