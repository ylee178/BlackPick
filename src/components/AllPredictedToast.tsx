"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n-provider";

/**
 * Fires a one-shot toast when the viewer has finished predicting every
 * pickable fight on an event card.
 *
 * "Pickable" means fights that still have an open picker (upcoming, not
 * cancelled, not no-contest, not already started). The event page computes
 * these two counts from the same source of truth as the fight list and
 * passes them down here.
 *
 * Dedup strategy — two independent guards:
 *  1. Transition detection via a ref that starts at the initial
 *     `predictedCount`. The toast only fires when we observe the count
 *     transition from `< predictableTotal` to `=== predictableTotal` within
 *     the lifetime of this mount. This handles the common case where the
 *     user completes their picks in the current session (after Save, the
 *     parent re-fetches and passes a new count prop).
 *  2. localStorage key `allPredictedToast:v1:${userId}:${eventId}`. Once
 *     we fire the toast we write the key, and on subsequent mounts we
 *     skip if it's already present. This protects against double-firing
 *     across session boundaries (e.g., user picks everything in tab A and
 *     later opens the event in tab B).
 *
 * Anonymous viewers do not see this toast — the component short-circuits
 * when `userId` is null, because there's nothing to persist against and
 * the signup gate will have already intervened on any pick attempt.
 */
type Props = {
  userId: string | null;
  eventId: string;
  /** Number of pickable fights on this event (upcoming, not cancelled). */
  predictableTotal: number;
  /** How many of the pickable fights the current user has predicted. */
  predictedCount: number;
};

export default function AllPredictedToast({
  userId,
  eventId,
  predictableTotal,
  predictedCount,
}: Props) {
  const { toast } = useToast();
  const { t } = useI18n();

  // Remember the predictedCount we had on first mount so we can detect the
  // transition (prev < total → current === total) within this component's
  // lifetime. Refs survive router.refresh() because the client component
  // is not unmounted when the server layer re-renders.
  const previousCountRef = useRef<number>(predictedCount);
  const firedThisMountRef = useRef<boolean>(false);

  useEffect(() => {
    // No user, no pickable fights, or user has nothing to finish → nothing
    // to announce. Also do nothing if we already fired during this mount.
    if (!userId) return;
    if (predictableTotal <= 0) return;
    if (firedThisMountRef.current) return;

    const previousCount = previousCountRef.current;
    const reachedAllThisTick =
      previousCount < predictableTotal && predictedCount >= predictableTotal;

    // Keep the ref in sync for the next render regardless of whether we
    // fire, so subsequent diffs are always against the last observed value.
    previousCountRef.current = predictedCount;

    if (!reachedAllThisTick) return;

    // Cross-session dedup: bail if we already celebrated this (user, event).
    const storageKey = `allPredictedToast:v1:${userId}:${eventId}`;
    try {
      if (window.localStorage.getItem(storageKey)) return;
      window.localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // Private-browsing or storage-disabled — fall through and fire
      // anyway. Worst case is a repeat toast in a later session, which
      // is still bounded by the "transition only within this mount" rule.
    }

    firedThisMountRef.current = true;
    toast(
      t("prediction.allPredictedToast", { count: predictableTotal }),
      "success",
    );
  }, [userId, eventId, predictableTotal, predictedCount, toast, t]);

  return null;
}
