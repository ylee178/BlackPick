"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-provider";
import { RetroLabel } from "@/components/ui/retro";
import { Clock, Flame } from "lucide-react";
import { deriveStickyHeaderSlot } from "@/lib/event-ui-state";

type Props = {
  eventName: string;
  eventStatus: "upcoming" | "live" | "completed";
  countdownTargetTime?: string | null;
  watchElementId: string;
  /**
   * Current user's `users.current_streak`. When the right slot is in
   * `streak` mode (per `deriveStickyHeaderSlot`), this value is
   * rendered next to a Flame icon. Null for anonymous viewers.
   *
   * Streak shows only during the timer-active or prediction-locked
   * states, never after the event completes. The gating is handled
   * by the shared helper — do not special-case it here.
   */
  currentStreak?: number | null;
};

function getTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

function MiniDigit({ value }: { value: string }) {
  return (
    <span className="lcd-digit-mini">
      {value}
    </span>
  );
}

export default function StickyEventHeader({
  eventName,
  eventStatus,
  countdownTargetTime,
  watchElementId,
  currentStreak = null,
}: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [headerH, setHeaderH] = useState(67);
  const [tl, setTl] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  // Measure main header height with ResizeObserver
  useEffect(() => {
    const header = document.getElementById("main-header");
    if (!header) return;
    const update = () => setHeaderH(header.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  // Show when watch element scrolls out of view
  useEffect(() => {
    const el = document.getElementById(watchElementId);
    if (!el) return;
    // rootMargin negative top = trigger only after element is fully behind the header
    const obs = new IntersectionObserver(
      ([e]) => setVisible(!e.isIntersecting),
      { threshold: 0, rootMargin: `-${headerH}px 0px 0px 0px` }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [watchElementId, headerH]);

  useEffect(() => {
    const init = window.setTimeout(
      () => setTl(countdownTargetTime ? getTimeLeft(countdownTargetTime) : null),
      0
    );
    if (!countdownTargetTime) return () => clearTimeout(init);
    const i = setInterval(() => setTl(getTimeLeft(countdownTargetTime)), 1000);
    return () => { clearTimeout(init); clearInterval(i); };
  }, [countdownTargetTime]);

  const pad = (n: number) => String(n).padStart(2, "0");

  // Derive the right-slot state each render. The slot helper is pure
  // and deterministic — identical facts + streak + now produce the
  // same slot. Using it here (not inline if/else) keeps the sub-header
  // visually consistent with wherever else we render event state.
  const slot = deriveStickyHeaderSlot(
    { eventPhase: eventStatus, firstLockAt: countdownTargetTime ?? null },
    currentStreak,
    // tl is null when the timer has burned out; Date.now() is the
    // right clock there. When tl is non-null we still pass Date.now()
    // for the derivation (the countdown branch is keyed on
    // firstLockAt > now, which this matches).
    Date.now(),
  );

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-30 border-b bg-[var(--bp-bg-translucent)] backdrop-blur-xl",
        "transition-all duration-200",
        visible ? "opacity-100 border-[var(--bp-line)] translate-y-0" : "opacity-0 border-transparent pointer-events-none -translate-y-1"
      )}
      style={{ top: `${headerH}px` }}
    >
      <div className="mx-auto flex min-h-[44px] max-w-[1200px] items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-sm font-bold text-[var(--bp-ink)]">{eventName}</p>
          <RetroLabel
            size="xs"
            tone={eventStatus === "live" ? "danger" : eventStatus === "completed" ? "success" : "info"}
          >
            {t(`status.${eventStatus}`)}
          </RetroLabel>
        </div>
        {slot.kind === "countdown" && tl ? (
          <div className="flex shrink-0 items-center gap-0.5" suppressHydrationWarning>
            <Clock className="mr-1 h-4 w-4 shrink-0 text-[var(--bp-accent)]" strokeWidth={2} />
            <MiniDigit value={pad(tl.d)} />
            <span className="lcd-colon-mini">:</span>
            <MiniDigit value={pad(tl.h)} />
            <span className="lcd-colon-mini">:</span>
            <MiniDigit value={pad(tl.m)} />
            <span className="lcd-colon-mini">:</span>
            <MiniDigit value={pad(tl.s)} />
          </div>
        ) : slot.kind === "streak" ? (
          <div className="flex shrink-0 items-center gap-1.5" suppressHydrationWarning>
            <Flame
              className="h-4 w-4 shrink-0 text-[var(--bp-accent)]"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="text-sm font-bold text-[var(--bp-ink)]">{slot.value}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
