"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-scope dismissal tracker for first-time onboarding prompts.
 *
 * Three-state return so the caller can render nothing during the brief
 * "checking localStorage on mount" window and avoid a flash of the
 * prompt on a previously-dismissed device. Passing `key={null}` keeps
 * the hook in `"checking"` until the caller has the id it needs.
 *
 * Schema is versioned via the caller's key (e.g. `"bp.onboarding.ringName.v1:<uid>"`).
 * Per the react-best-practices `client-localstorage-schema` rule, bump
 * the version in the key whenever the stored shape changes.
 */
export type OnboardingDismissalStatus = "checking" | "show" | "hide";

export function useOnboardingDismissal(
  key: string | null,
  ttlMs?: number,
): { status: OnboardingDismissalStatus; dismiss: () => void } {
  const [status, setStatus] = useState<OnboardingDismissalStatus>("checking");

  useEffect(() => {
    if (!key) {
      setStatus("checking");
      return;
    }
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        if (ttlMs === undefined) {
          setStatus("hide");
          return;
        }
        const age = Date.now() - Number(stored);
        if (Number.isFinite(age) && age < ttlMs) {
          setStatus("hide");
          return;
        }
      }
    } catch {
      // Private browsing / storage disabled — treat as never dismissed.
    }
    setStatus("show");
  }, [key, ttlMs]);

  const dismiss = useCallback(() => {
    if (!key) return;
    try {
      window.localStorage.setItem(key, String(Date.now()));
    } catch {
      // Ignore — nothing to persist against, but still hide in-session.
    }
    setStatus("hide");
  }, [key]);

  return { status, dismiss };
}

export const ONBOARDING_TTL_30_DAYS = 30 * 24 * 60 * 60 * 1000;

export const ONBOARDING_KEYS = {
  ringNamePrompt: (userId: string) => `bp.onboarding.ringName.v1:${userId}`,
  anonFirstPickCta: () => `bp.onboarding.anonCta.v1`,
  firstPickHint: (userId: string, fightId: string) =>
    `bp.onboarding.firstPickHint.v1:${userId}:${fightId}`,
} as const;
