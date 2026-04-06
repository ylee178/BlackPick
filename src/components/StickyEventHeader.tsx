"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-provider";
import { RetroStatusBadge } from "@/components/ui/retro";
import { Clock } from "lucide-react";

type Props = {
  eventName: string;
  eventStatus: "upcoming" | "live" | "completed";
  countdownTargetTime?: string | null;
  watchElementId: string;
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

export default function StickyEventHeader({ eventName, eventStatus, countdownTargetTime, watchElementId }: Props) {
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
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0">
            <RetroStatusBadge
              tone={eventStatus === "live" ? "danger" : eventStatus === "completed" ? "success" : "info"}
            >
              {t(`status.${eventStatus}`)}
            </RetroStatusBadge>
          </div>
          <p className="min-w-0 truncate text-sm font-bold leading-none text-[var(--bp-ink)]">{eventName}</p>
        </div>
        {tl && (
          <div className="flex shrink-0 items-center gap-0.5" suppressHydrationWarning>
            <Clock className="mr-1 h-[18px] w-[18px] text-[var(--bp-accent)]" strokeWidth={2} />
            <MiniDigit value={pad(tl.d)} />
            <span className="lcd-colon-mini">:</span>
            <MiniDigit value={pad(tl.h)} />
            <span className="lcd-colon-mini">:</span>
            <MiniDigit value={pad(tl.m)} />
            <span className="lcd-colon-mini">:</span>
            <MiniDigit value={pad(tl.s)} />
          </div>
        )}
      </div>
    </div>
  );
}
