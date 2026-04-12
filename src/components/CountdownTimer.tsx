"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { useClockTick } from "@/lib/use-sync-store";

type Props = { targetTime: string };

type TimeLeft = {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const EMPTY_TIME_LEFT: TimeLeft = {
  total: 1,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

function getTimeLeft(target: string, nowMs: number): TimeLeft {
  const diff = new Date(target).getTime() - nowMs;
  if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total: diff,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function formatTime(tl: { days: number; hours: number; minutes: number; seconds: number }) {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (tl.days > 0) return `${tl.days}d ${pad(tl.hours)}h ${pad(tl.minutes)}m ${pad(tl.seconds)}s`;
  if (tl.hours > 0) return `${pad(tl.hours)}h ${pad(tl.minutes)}m ${pad(tl.seconds)}s`;
  return `${pad(tl.minutes)}m ${pad(tl.seconds)}s`;
}

export default function CountdownTimer({ targetTime }: Props) {
  const { t } = useI18n();
  // Shared 1Hz store — 0 on SSR, live Date.now() after hydration.
  const now = useClockTick();
  const mounted = now !== 0;
  const tl = mounted ? getTimeLeft(targetTime, now) : EMPTY_TIME_LEFT;
  const text = useMemo(() => formatTime(tl), [tl]);

  if (tl.total <= 0 && mounted) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-center text-sm font-bold text-white/60">
        {t("countdown.locked")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#ffba3c]/15 bg-[#ffba3c]/[0.03] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/55">{t("countdown.closesIn")}</p>
      <p
        className="mt-1 text-2xl font-black tabular-nums text-[#ffba3c]"
        style={{ fontFamily: "var(--font-display)" }}
        suppressHydrationWarning
      >
        {mounted ? text : "--:--:--"}
      </p>
    </div>
  );
}
