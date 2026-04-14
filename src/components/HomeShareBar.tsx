"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Lock } from "lucide-react";
import ShareMenu from "@/components/ShareMenu";
import { useI18n } from "@/lib/i18n-provider";
import { useIsMounted } from "@/lib/use-sync-store";
import { Link } from "@/i18n/navigation";
import { retroButtonClassName } from "@/components/ui/retro";
import { cn } from "@/lib/utils";

/**
 * Home-page share entry point rendered at the right end of the
 * "Who's Taking This?" fight-list title row.
 *
 * State machine (mirrors EventShareCta but compact):
 *  - Anonymous → render nothing (the whole component is null for
 *    viewers without a session).
 *  - Authed, no ring name → soft link button to /profile.
 *  - Authed, no picks saved → disabled hint button.
 *  - Authed, picks saved → ShareMenu trigger (channel picker).
 *
 * When the inline trigger scrolls out of view (IntersectionObserver
 * on a self-ref), a portal-mounted bottom-sticky card appears with
 * a one-line prompt + Share button. The sticky card is only rendered
 * in the enabled state — disabled hint buttons don't warrant a
 * promote layer. Mobile sits above the fixed nav at bottom-0 z-50,
 * desktop at bottom-5. Respects prefers-reduced-motion by dropping
 * the slide-in animation (not implemented yet — instant mount for
 * simplicity).
 */
type Props = {
  ringName: string | null;
  eventName: string;
  shareUrl: string | null;
  hasAnyPicks: boolean;
};

export default function HomeShareBar({
  ringName,
  eventName,
  shareUrl,
  hasAnyPicks,
}: Props) {
  const { t } = useI18n();
  const triggerRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  const mounted = useIsMounted();

  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      // Fire when the element has fully left the viewport (below the
      // main header offset). -80px top margin means the observer
      // treats the top 80px of the viewport as "not visible" —
      // roughly clears the fixed main header.
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Disabled-state short-circuit: no ring name OR no picks → render
  // the compact hint button inline, skip the sticky layer entirely.
  if (!ringName) {
    return (
      <div ref={triggerRef} className="shrink-0">
        <Link
          href="/profile"
          className={retroButtonClassName({
            variant: "soft",
            size: "sm",
            className: "gap-1.5",
          })}
        >
          <Lock className="h-3.5 w-3.5" strokeWidth={2} />
          {t("share.ctaDisabledNoRingName")}
        </Link>
      </div>
    );
  }

  if (!hasAnyPicks || !shareUrl) {
    return (
      <div ref={triggerRef} className="shrink-0">
        <button
          type="button"
          disabled
          className={cn(
            retroButtonClassName({
              variant: "soft",
              size: "sm",
              className: "gap-1.5",
            }),
            "cursor-not-allowed opacity-60",
          )}
        >
          <Lock className="h-3.5 w-3.5" strokeWidth={2} />
          {t("share.ctaDisabledNoPicks")}
        </button>
      </div>
    );
  }

  const shareTitle = `${ringName} · ${eventName}`;
  const shareText = t("share.shareText", { username: ringName, event: eventName });

  return (
    <>
      <div ref={triggerRef} className="shrink-0">
        <ShareMenu
          url={shareUrl}
          title={shareTitle}
          text={shareText}
          triggerLabel={t("share.trigger")}
          triggerVariant="secondary"
          triggerSize="sm"
        />
      </div>

      {mounted && showSticky
        ? createPortal(
            <div
              className={cn(
                "pointer-events-none fixed inset-x-0 z-40 mx-auto max-w-[1200px] px-4 sm:px-6",
                // Sit above the mobile bottom nav (fixed z-50 at
                // bottom-0 with safe-area). On desktop the nav is
                // hidden so bottom-5 is enough clearance.
                "bottom-[calc(env(safe-area-inset-bottom)+80px)] md:bottom-5",
              )}
            >
              {/* Glass banner — no border, translucent dark with
                  heavy backdrop-blur. Sean 2026-04-14: "쉐어 배너
                  보더 없으 글라스 배너로". */}
              <div className="pointer-events-auto flex items-center gap-3 rounded-[14px] bg-[rgba(12,12,12,0.55)] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <p className="min-w-0 flex-1 text-sm font-medium text-[var(--bp-ink)]">
                  {t("share.stickyPrompt")}
                </p>
                <ShareMenu
                  url={shareUrl}
                  title={shareTitle}
                  text={shareText}
                  triggerLabel={t("share.trigger")}
                  triggerVariant="primary"
                  triggerSize="sm"
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
