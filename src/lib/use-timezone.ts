"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  detectUserTimezone,
  loadStoredTimezone,
  saveStoredTimezone,
} from "@/lib/timezone";

/**
 * Lightweight cross-component timezone state. The browser is the only
 * source of truth (Intl + localStorage), and we use a custom DOM event
 * plus the cross-tab `storage` event to keep multiple consumers
 * (FlipTimer, EventDateLine, …) in sync when any one of them mutates the
 * preference.
 *
 * Implemented with `useSyncExternalStore` so there is no
 * `useEffect(() => setState(...))` hop — the old hydration pattern was
 * tripping the new `react-hooks/set-state-in-effect` rule, and the
 * external store model is the React-recommended replacement.
 *
 * `tz === null` during SSR and the very first client paint so consumers
 * can show a placeholder instead of flashing the wrong timezone.
 */

const EVENT_NAME = "bp:timezone-change";

export type TimezoneSnapshot = {
  tz: string | null;
  detected: string | null;
};

const SERVER_SNAPSHOT: TimezoneSnapshot = { tz: null, detected: null };

// Cached snapshot so `getSnapshot` returns a stable reference when the
// underlying values haven't changed. React compares snapshots with
// Object.is and will re-render infinitely if we hand back a fresh object
// on every call without a real change.
let cachedSnapshot: TimezoneSnapshot | null = null;

function computeClientSnapshot(): TimezoneSnapshot {
  const detected = detectUserTimezone();
  const tz = loadStoredTimezone() ?? detected;
  if (
    cachedSnapshot &&
    cachedSnapshot.tz === tz &&
    cachedSnapshot.detected === detected
  ) {
    return cachedSnapshot;
  }
  cachedSnapshot = { tz, detected };
  return cachedSnapshot;
}

function getSnapshot(): TimezoneSnapshot {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  return computeClientSnapshot();
}

function getServerSnapshot(): TimezoneSnapshot {
  return SERVER_SNAPSHOT;
}

function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    // Invalidate so the next `getSnapshot` picks up whatever the writer
    // just committed to localStorage.
    cachedSnapshot = null;
    listener();
  };
  window.addEventListener(EVENT_NAME, handler);
  // `storage` fires only on OTHER tabs, which is exactly what we need
  // for cross-tab sync. Same-tab updates are delivered via EVENT_NAME.
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useTimezone() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setTz = useCallback((next: string) => {
    saveStoredTimezone(next);
    cachedSnapshot = null;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
    }
  }, []);

  return { tz: snapshot.tz, detected: snapshot.detected, setTz };
}
