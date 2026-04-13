"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Per-scope dismissal tracker for first-time onboarding prompts.
 *
 * Backed by `useSyncExternalStore` so that SSR / hydration resolves to
 * `"checking"` on both server and first client render, then snaps to
 * the real `"show" | "hide"` value post-hydration. This sidesteps the
 * `react-hooks/set-state-in-effect` rule (no setState in an effect)
 * and the flash-of-prompt hydration mismatch in one move.
 *
 * Passing `key={null}` keeps the hook in `"checking"` until the caller
 * has the id it needs — useful during optimistic / deferred loads.
 *
 * Schema is versioned via the caller's key (e.g. `"bp.onboarding.ringName.v1:<uid>"`).
 * Per the react-best-practices `client-localstorage-schema` rule,
 * bump the version in the key whenever the stored shape changes.
 */
export type OnboardingDismissalStatus = "checking" | "show" | "hide";

type Listener = () => void;

// Module-level broker: dismiss() writes localStorage on the current tab,
// which does NOT fire a `storage` event (spec: only cross-tab writes do).
// We notify all mounted hook instances directly so they re-read the
// snapshot via useSyncExternalStore. A lightweight Set is correct here
// because the listeners are all in-process client components.
const listeners = new Set<Listener>();

function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifyListeners(): void {
  listeners.forEach((cb) => cb());
}

function readStatus(key: string, ttlMs: number | undefined): OnboardingDismissalStatus {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored) {
      if (ttlMs === undefined) return "hide";
      const age = Date.now() - Number(stored);
      if (Number.isFinite(age) && age < ttlMs) return "hide";
    }
  } catch {
    // Private browsing / storage disabled — treat as never dismissed.
  }
  return "show";
}

// Stable server snapshot: always "checking" so the server-rendered HTML
// and the first client render agree, regardless of the device's actual
// dismissal state. The real status resolves one tick later, after
// useSyncExternalStore swaps to the client getSnapshot post-hydration.
function getServerSnapshot(): OnboardingDismissalStatus {
  return "checking";
}

export function useOnboardingDismissal(
  key: string | null,
  ttlMs?: number,
): { status: OnboardingDismissalStatus; dismiss: () => void } {
  const getSnapshot = useCallback((): OnboardingDismissalStatus => {
    if (!key) return "checking";
    return readStatus(key, ttlMs);
  }, [key, ttlMs]);

  const status = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const dismiss = useCallback(() => {
    if (!key) return;
    try {
      window.localStorage.setItem(key, String(Date.now()));
    } catch {
      // Ignore write failure — still notify so the in-session render hides.
    }
    notifyListeners();
  }, [key]);

  return { status, dismiss };
}

export const ONBOARDING_TTL_30_DAYS = 30 * 24 * 60 * 60 * 1000;

export const ONBOARDING_KEYS = {
  ringNamePrompt: (userId: string) => `bp.onboarding.ringName.v1:${userId}`,
  anonFirstPickCta: () => `bp.onboarding.anonCta.v1`,
  firstPickHint: (userId: string) => `bp.onboarding.firstPickHint.v1:${userId}`,
} as const;
