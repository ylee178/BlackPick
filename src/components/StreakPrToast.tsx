"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n-provider";

/**
 * Fires a one-shot toast when the viewer's `best_streak` has strictly
 * increased since the last time this device observed it.
 *
 * Streak writes happen only inside the `process_fight_result` RPC on admin
 * result verification — never client-side. So the only observable signal
 * we have is "on page load, server state differs from what this device
 * last saw". We use two localStorage keys to reason about this safely:
 *
 *  1. `bp.streakBest.v1:${userId}` — the last `best_streak` value we've
 *     rendered from for this user on this device. On very first observation
 *     we sync silently (no fire) because we cannot distinguish "fresh PR
 *     that just happened" from "old PR that predates this feature".
 *  2. `bp.streakPR.v1:${userId}:${bestStreakValue}` — dismissal lock for a
 *     specific PR value. Prevents re-fire on reload within the same PR.
 *
 * PR condition (all must hold):
 *  - server_best > stored_best                 (strict increase — fixes the
 *                                                 tie-rebuild false positive
 *                                                 where `current = old_best`
 *                                                 makes `current === best`
 *                                                 without `best` actually
 *                                                 increasing)
 *  - server_current >= STREAK_PR_MIN            (don't celebrate trivial 1s)
 *  - server_current === server_best             (belt + suspenders — guards
 *                                                 against an admin-migration
 *                                                 scenario where `best_streak`
 *                                                 is manually raised without
 *                                                 a corresponding win bumping
 *                                                 `current_streak`)
 *  - no dismissal lock for this specific `bestStreakValue`
 *
 * Anonymous viewers never see this toast — null userId short-circuits
 * immediately and we never write to localStorage. This is important because
 * layout-wide mount means this runs on `/login`, `/signup`, `/privacy`, etc.
 */

const STREAK_PR_MIN = 2;

const baselineKey = (userId: string) => `bp.streakBest.v1:${userId}`;
const lockKey = (userId: string, bestStreakValue: number) =>
  `bp.streakPR.v1:${userId}:${bestStreakValue}`;

type Props = {
  userId: string | null;
  currentStreak: number;
  bestStreak: number;
};

export default function StreakPrToast({ userId, currentStreak, bestStreak }: Props) {
  const { toast } = useToast();
  const { t } = useI18n();

  const firedThisMountRef = useRef<boolean>(false);

  useEffect(() => {
    if (!userId) return;
    if (firedThisMountRef.current) return;

    let storedBest: number | null;
    try {
      const raw = window.localStorage.getItem(baselineKey(userId));
      if (raw === null) {
        storedBest = null;
      } else {
        const parsed = Number.parseInt(raw, 10);
        storedBest = Number.isFinite(parsed) ? parsed : null;
      }
    } catch {
      return;
    }

    // First observation for this user on this device — sync silently.
    // We can't tell a fresh PR apart from pre-feature history without a
    // server history trail we don't have, so the non-lying default is
    // "baseline silently, never fire on first read".
    if (storedBest === null) {
      try {
        window.localStorage.setItem(baselineKey(userId), String(bestStreak));
      } catch {
        // Private-browsing — accept that we'll re-sync on every future load
        // but never fire on first-read either way.
      }
      return;
    }

    // Strict-increase gate. A tie (server_best === stored_best) or a
    // decrease (admin correction, rollback, device drift) must never fire.
    const isGenuinePr =
      bestStreak > storedBest &&
      currentStreak >= STREAK_PR_MIN &&
      currentStreak === bestStreak;

    if (!isGenuinePr) {
      // Baseline may have drifted (e.g., admin correction decreased it, or
      // another device pushed it higher mid-session). Resync silently so
      // we never fire for a value we've already seen.
      if (bestStreak !== storedBest) {
        try {
          window.localStorage.setItem(baselineKey(userId), String(bestStreak));
        } catch {
          // Ignore — next load will retry.
        }
      }
      return;
    }

    // Dismissal lock — set once per PR value. Prevents re-fire on reload.
    const lock = lockKey(userId, bestStreak);
    try {
      if (window.localStorage.getItem(lock)) {
        // Lock already present — advance baseline so we don't keep
        // re-checking this value on every load, but do not fire.
        window.localStorage.setItem(baselineKey(userId), String(bestStreak));
        return;
      }
      window.localStorage.setItem(lock, String(Date.now()));
      window.localStorage.setItem(baselineKey(userId), String(bestStreak));
    } catch {
      // Private-browsing — fire anyway, the "transition only within this
      // mount" ref guard still prevents double-fire inside this session.
    }

    firedThisMountRef.current = true;
    toast(t("profile.streakPrToast", { streak: currentStreak }), "streak");
  }, [userId, currentStreak, bestStreak, toast, t]);

  return null;
}
