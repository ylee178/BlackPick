"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";

type StickyEventHeaderProps = {
  eventName: string;
  eventStatus: "upcoming" | "live" | "completed";
  countdownTargetTime?: string | null;
  watchElementId: string;
};

type TimeLeft = {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getTimeLeft(targetTime: string): TimeLeft {
  const target = new Date(targetTime).getTime();
  const now = Date.now();
  const total = target - now;

  if (Number.isNaN(target) || total <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

export default function StickyEventHeader({
  eventName,
  eventStatus,
  countdownTargetTime,
  watchElementId,
}: StickyEventHeaderProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    countdownTargetTime ? getTimeLeft(countdownTargetTime) : getTimeLeft("")
  );

  useEffect(() => {
    const element = document.getElementById(watchElementId);
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: "-1px 0px 0px 0px",
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [watchElementId]);

  useEffect(() => {
    if (!countdownTargetTime || eventStatus !== "upcoming") return;

    setTimeLeft(getTimeLeft(countdownTargetTime));

    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(countdownTargetTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownTargetTime, eventStatus]);

  const countdownText = useMemo(() => {
    if (!countdownTargetTime || eventStatus !== "upcoming" || timeLeft.total <= 0) {
      return null;
    }

    const { days, hours, minutes, seconds } = timeLeft;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }, [countdownTargetTime, eventStatus, timeLeft]);

  return (
    <div
      className={`sticky top-0 z-40 -mx-4 mb-4 border-b border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur transition-all duration-200 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 ${
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-full opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{eventName}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
            eventStatus === "live" ? "border-red-500/30 bg-red-500/10 text-red-300" :
            eventStatus === "completed" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" :
            "border-sky-500/30 bg-sky-500/10 text-sky-300"
          }`}>
            {t(`event.${eventStatus}`)}
          </span>
          {countdownText && (
            <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
              <span className="mr-1">⏱️</span>
              <span className="text-gray-300">{t("countdown.closesIn")}</span>
              <span className="ml-1 font-mono font-semibold" suppressHydrationWarning>
                {countdownText}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
