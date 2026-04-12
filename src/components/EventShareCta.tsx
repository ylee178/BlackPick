"use client";

import { Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import ShareMenu from "@/components/ShareMenu";
import { useI18n } from "@/lib/i18n-provider";
import { retroButtonClassName } from "@/components/ui/retro";
import { cn } from "@/lib/utils";

/**
 * Event-page Share CTA wrapper.
 *
 * Consolidates the state machine for "can this user share / what copy
 * should the button show / where should it live" into a single client
 * component. The event page just passes in the raw counts and this
 * component decides what to render.
 *
 * States (first-match wins):
 *
 *   1. disabled: no ring_name
 *      → Link-style button "Set a ring name to share" → /profile
 *   2. disabled: authed but zero saved picks on this card
 *      → Static disabled button "Save a pick to unlock sharing"
 *   3. enabled + post-result + streak ≥ 3 (user-level)
 *      → "🔥 {streak} in a row — share"
 *   4. enabled + post-result + card has wins/losses resolved
 *      → "{wins}-{losses} this card — share"
 *   5. enabled + all upcoming picks locked in
 *      → "{n}/{total} locked in — share your card"
 *   6. enabled + has picks but not all
 *      → "Share your card"
 *
 * Streak wiring lands in Branch 8 (`feature/streak-ux`); until then
 * `userCurrentStreak` stays null and variant 3 never fires. The prop
 * is already plumbed so Branch 8 only has to fetch the value at the
 * event-page level and pass it down — no component changes needed.
 *
 * Rendering
 * ---------
 * Two visual slots:
 *   a. Inline button inside the event hero — always rendered.
 *   b. Sticky mobile bottom bar — only when enabled AND the viewport
 *      is below the `md` breakpoint. Fixed position with safe-area
 *      inset padding so it doesn't collide with iOS home indicator.
 *
 * The sticky bar intentionally does NOT appear in the disabled states,
 * because disabled CTAs at the bottom of a mobile viewport are more
 * annoying than helpful.
 */
type Props = {
  /** The current user's ring_name, or null if unset / anonymous. */
  ringName: string | null;
  /** Event name for share intent text. */
  eventName: string;
  /**
   * True when the viewer has at least one saved pick anywhere on
   * this event (upcoming, live, or completed). Used only to gate
   * the `disabled_no_picks` variant — domain-distinct from
   * `upcomingPickedCount` which counts only the pickable slice.
   */
  hasAnyPicks: boolean;
  /**
   * Count of predictions the user has saved on fights that are
   * still in `upcoming` status. Paired with `upcomingTotal` to
   * drive the `all_locked_in` variant. A previous revision used
   * `pickedEntries.length` here which mixed domains and could
   * produce impossible "3/2 locked in" copy when completed-fight
   * picks exceeded the upcoming-fight total.
   */
  upcomingPickedCount: number;
  /** Count of upcoming (pickable) fights on the event. */
  upcomingTotal: number;
  /** Count of correct picks on completed fights. */
  winsThisCard: number;
  /** Count of incorrect picks on completed fights. */
  lossesThisCard: number;
  /** User's current streak (from `users.current_streak`). Null until Branch 8. */
  userCurrentStreak: number | null;
  /** Profile route to send users with no ring_name to. */
  profileHref: string;
  /**
   * Pre-built share URL path (from `buildSharePath`), or `null` if
   * the user has no ring_name (disabled states don't need the URL).
   */
  shareUrl: string | null;
};

export default function EventShareCta({
  ringName,
  eventName,
  hasAnyPicks,
  upcomingPickedCount,
  upcomingTotal,
  winsThisCard,
  lossesThisCard,
  userCurrentStreak,
  profileHref,
  shareUrl,
}: Props) {
  const { t } = useI18n();

  // State machine — compute the variant first so both slots render
  // from the same source.
  const variant = computeVariant({
    ringName,
    hasAnyPicks,
    upcomingPickedCount,
    upcomingTotal,
    winsThisCard,
    lossesThisCard,
    userCurrentStreak,
  });

  // ── Disabled states ────────────────────────────────────────────
  if (variant.kind === "disabled_no_ring_name") {
    return (
      <div className="mt-4">
        <Link
          href={profileHref}
          className={retroButtonClassName({
            variant: "soft",
            size: "md",
            block: true,
            className: "justify-center gap-2",
          })}
        >
          <Lock className="h-4 w-4" strokeWidth={2} />
          {t("share.ctaDisabledNoRingName")}
        </Link>
      </div>
    );
  }

  if (variant.kind === "disabled_no_picks") {
    return (
      <div className="mt-4">
        <button
          type="button"
          disabled
          className={cn(
            retroButtonClassName({
              variant: "soft",
              size: "md",
              block: true,
              className: "justify-center gap-2",
            }),
            "cursor-not-allowed opacity-50",
          )}
        >
          <Lock className="h-4 w-4" strokeWidth={2} />
          {t("share.ctaDisabledNoPicks")}
        </button>
      </div>
    );
  }

  // ── Enabled states: resolve label from variant ────────────────
  // If we somehow reached an enabled variant without a real shareUrl
  // (shouldn't happen because disabled_no_ring_name catches it
  // upstream, but defense in depth), fall through to rendering
  // nothing rather than passing a malformed URL to ShareMenu.
  if (!shareUrl || !ringName) return null;

  const label = resolveLabel(variant, t);
  const shareText = t("share.shareText", {
    username: ringName,
    event: eventName,
  });

  // NOTE: mobile sticky bottom bar deferred to a follow-up branch.
  // The app layout already has a fixed mobile nav at `bottom-0 z-50`
  // and a mirror `pb-24` on the event page root that clears it.
  // Stacking a second fixed-position CTA cleanly requires extending
  // that padding AND picking a non-overlapping bottom offset, which
  // is a layout-level change out of scope for this bugfix branch.
  // TODO(Phase 1): see TASKS.md branch 2-extra "mobile sticky share
  // CTA" for the follow-up.
  return (
    <div className="mt-4">
      <ShareMenu
        url={shareUrl}
        title={`${ringName} · ${eventName}`}
        text={shareText}
        triggerLabel={label}
        triggerVariant="primary"
        triggerSize="md"
        className="w-full justify-center"
      />
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────

type Variant =
  | { kind: "disabled_no_ring_name" }
  | { kind: "disabled_no_picks" }
  | { kind: "streak_badge"; streak: number }
  | { kind: "record_badge"; wins: number; losses: number }
  | { kind: "all_locked_in"; n: number; total: number }
  | { kind: "default_has_picks" };

function computeVariant({
  ringName,
  hasAnyPicks,
  upcomingPickedCount,
  upcomingTotal,
  winsThisCard,
  lossesThisCard,
  userCurrentStreak,
}: {
  ringName: string | null;
  hasAnyPicks: boolean;
  upcomingPickedCount: number;
  upcomingTotal: number;
  winsThisCard: number;
  lossesThisCard: number;
  userCurrentStreak: number | null;
}): Variant {
  if (!ringName) return { kind: "disabled_no_ring_name" };
  if (!hasAnyPicks) return { kind: "disabled_no_picks" };

  // Post-result states take priority — once fights resolve, the copy
  // should reflect reality (streak / W-L) instead of the "all locked
  // in" pre-lock message.
  const hasResolvedResults = winsThisCard + lossesThisCard > 0;
  if (hasResolvedResults) {
    if (userCurrentStreak !== null && userCurrentStreak >= 3) {
      return { kind: "streak_badge", streak: userCurrentStreak };
    }
    return {
      kind: "record_badge",
      wins: winsThisCard,
      losses: lossesThisCard,
    };
  }

  // Pre-result: celebrate a fully-predicted upcoming card. Counting
  // only upcoming picks (not all picks) prevents the impossible
  // "3/2 locked in" state when the user has picks on completed or
  // cancelled fights as well.
  if (upcomingTotal > 0 && upcomingPickedCount >= upcomingTotal) {
    return {
      kind: "all_locked_in",
      n: upcomingPickedCount,
      total: upcomingTotal,
    };
  }

  // Has some picks, not all, no results yet — generic share.
  return { kind: "default_has_picks" };
}

function resolveLabel(
  variant: Exclude<
    Variant,
    { kind: "disabled_no_ring_name" } | { kind: "disabled_no_picks" }
  >,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  switch (variant.kind) {
    case "streak_badge":
      return t("share.ctaCompleteStreak", { streak: variant.streak });
    case "record_badge":
      return t("share.ctaCompleteRecord", {
        wins: variant.wins,
        losses: variant.losses,
      });
    case "all_locked_in":
      return t("share.ctaAllLocked", {
        n: variant.n,
        total: variant.total,
      });
    case "default_has_picks":
      return t("share.ctaDefault");
  }
}

