"use client";

import { useCallback, useEffect, useState } from "react";
import {
  detectUserTimezone,
  loadStoredTimezone,
  saveStoredTimezone,
} from "@/lib/timezone";

/**
 * Lightweight cross-component timezone state. The browser is the only
 * source of truth (Intl + localStorage), and we use a custom DOM event
 * to keep multiple consumers (FlipTimer, EventDateLine, …) in sync when
 * any one of them mutates the preference.
 *
 * Returns `tz === null` until hydration completes so consumers can show
 * a placeholder instead of flashing the wrong timezone on first render.
 */

const EVENT_NAME = "bp:timezone-change";

export function useTimezone() {
  const [detected, setDetected] = useState<string | null>(null);
  const [tz, setTzState] = useState<string | null>(null);

  useEffect(() => {
    const d = detectUserTimezone();
    setDetected(d);
    setTzState(loadStoredTimezone() ?? d);

    const handler = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (typeof next === "string" && next.length > 0) {
        setTzState(next);
      }
    };
    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, []);

  const setTz = useCallback((next: string) => {
    saveStoredTimezone(next);
    setTzState(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
    }
  }, []);

  return { tz, detected, setTz };
}
