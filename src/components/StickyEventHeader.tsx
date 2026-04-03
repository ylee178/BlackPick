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

  const statusClass =
    eventStatus === "live"
      ? "border-[#E10600]/30 bg-[#E10600]/10 text-[#F5F7FA]"
      : eventStatus === "completed"
        ? "border-[#C9A96A]/30 bg-[#C9A96A]/10 text-[#C9A96A]"
        : "border-white/10 bg-white/5 text-[#F5F7FA]";

  return (
    <div
      className={`sticky top-0 z-50 -mx-4 mb-4 border-b border-white/10 bg-[#0B0B0C]/92 px-4 py-3 backdrop-blur transition-all duration-300 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 ${
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-full opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
            {t("event.event")}
          </p>
          <p className="truncate text-sm font-semibold text-[#F5F7FA]">{eventName}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusClass}`}>
            {t(`event.${eventStatus}`)}
          </span>

          {countdownText && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E10600]/20 bg-[#15171A] px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-[#E10600] shadow-[0_0_10px_rgba(225,6,0,0.6)]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                {t("countdown.closesIn")}
              </span>
              <span
                className="text-sm font-black text-[#F5F7FA]"
                style={{ fontFamily: "Barlow Condensed, Pretendard, sans-serif" }}
                suppressHydrationWarning
              >
                {countdownText}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
