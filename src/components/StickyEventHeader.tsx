"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n-provider";
import { RetroStatusBadge } from "@/components/ui/retro";

type Props = {
  eventName: string;
  eventStatus: "upcoming" | "live" | "completed";
  countdownTargetTime?: string | null;
  watchElementId: string;
};

function getTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function StickyEventHeader({ eventName, eventStatus, countdownTargetTime, watchElementId }: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    const el = document.getElementById(watchElementId);
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting), { threshold: 0, rootMargin: "0px 0px 0px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [watchElementId]);

  useEffect(() => {
    const initTimer = window.setTimeout(
      () => setCountdown(countdownTargetTime ? getTimeLeft(countdownTargetTime) : null),
      0
    );

    if (!countdownTargetTime) {
      return () => clearTimeout(initTimer);
    }

    const i = setInterval(() => setCountdown(getTimeLeft(countdownTargetTime)), 1000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(i);
    };
  }, [countdownTargetTime]);

  return (
    <div
      className={cn(
        "fixed left-0 right-0 top-[61px] z-30 border-b bg-[rgba(5,5,5,0.8)] backdrop-blur-xl",
        "transition-opacity duration-100",
        visible ? "opacity-100 border-[var(--bp-line)]" : "opacity-0 border-transparent pointer-events-none"
      )}
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
        <div className="flex shrink-0 items-center gap-2">
          {countdown && (
            <div className="flex items-center gap-2 rounded-[10px] border border-[rgba(255,186,60,0.15)] bg-[var(--bp-accent-dim)] px-3 py-1.5">
              <svg viewBox="0 0 16 16" className="h-4 w-4 text-[var(--bp-accent)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="6.5" />
                <path d="M8 4.5V8l2.5 1.5" />
              </svg>
              <span className="text-sm font-bold tabular-nums tracking-wide text-[var(--bp-accent)]" suppressHydrationWarning>
                {countdown}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
