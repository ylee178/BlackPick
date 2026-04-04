"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";

function getTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { total: 0, d: 0, h: 0, m: 0, s: 0 };
  return {
    total: diff,
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

function Digit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-bold tabular-nums text-[var(--bp-ink)] md:text-2xl">
        {value.padStart(2, "0")}
      </span>
      <span className="text-[10px] font-medium uppercase text-[var(--bp-muted)]">{label}</span>
    </div>
  );
}

export default function FlipTimer({ targetTime }: { targetTime: string }) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [tl, setTl] = useState({ total: 1, d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const mountTimer = window.setTimeout(() => {
      setMounted(true);
      setTl(getTimeLeft(targetTime));
    }, 0);
    const i = setInterval(() => setTl(getTimeLeft(targetTime)), 1000);
    return () => {
      clearTimeout(mountTimer);
      clearInterval(i);
    };
  }, [targetTime]);

  if (tl.total <= 0 && mounted) {
    return (
      <div className="rounded-[12px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-4 py-3 text-center">
        <p className="text-sm font-semibold text-[var(--bp-muted)]">{t("countdown.locked")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-4 py-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--bp-muted)]">
        {t("countdown.closesIn")}
      </p>
      <div className="flex items-baseline gap-3" suppressHydrationWarning>
        <Digit value={mounted ? String(tl.d) : "--"} label={t("countdown.daysShort")} />
        <span className="text-[var(--bp-muted)]">:</span>
        <Digit value={mounted ? String(tl.h) : "--"} label={t("countdown.hoursShort")} />
        <span className="text-[var(--bp-muted)]">:</span>
        <Digit value={mounted ? String(tl.m) : "--"} label={t("countdown.minutesShort")} />
        <span className="text-[var(--bp-muted)]">:</span>
        <Digit value={mounted ? String(tl.s) : "--"} label={t("countdown.secondsShort")} />
      </div>
    </div>
  );
}
