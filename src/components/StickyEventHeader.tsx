"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";

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
    const obs = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [watchElementId]);

  useEffect(() => {
    if (!countdownTargetTime) return;
    setCountdown(getTimeLeft(countdownTargetTime));
    const i = setInterval(() => setCountdown(getTimeLeft(countdownTargetTime)), 1000);
    return () => clearInterval(i);
  }, [countdownTargetTime]);

  return (
    <div
      className={`sticky top-0 z-50 -mx-5 border-b border-[#ffba3c]/8 bg-black/95 px-5 py-3 backdrop-blur-xl transition-all duration-300 sm:-mx-8 sm:px-8 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{eventName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
            eventStatus === "live" ? "bg-red-500/15 text-red-400" :
            eventStatus === "completed" ? "bg-[#ffba3c]/10 text-[#ffba3c]/60" :
            "bg-white/5 text-white/40"
          }`}>
            {t(`event.${eventStatus}`)}
          </span>
          {countdown && (
            <span
              className="text-xs font-bold text-[#ffba3c]"
              style={{ fontFamily: "var(--font-display)" }}
              suppressHydrationWarning
            >
              {countdown}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
