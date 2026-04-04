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

function FlipDigit({ value, label }: { value: string; label: string }) {
  const digits = value.padStart(2, "0").split("");
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-0.5">
        {digits.map((d, i) => (
          <div
            key={i}
            className="relative flex h-14 w-10 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a] md:h-16 md:w-12"
          >
            {/* Top half gradient */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.04] to-transparent" />
            {/* Center split line */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-black/60" />
            {/* Digit */}
            <span
              className="relative text-2xl font-black text-white md:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {d}
            </span>
          </div>
        ))}
      </div>
      <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/45">{label}</span>
    </div>
  );
}

function Separator() {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-1 pb-4">
      <div className="h-1.5 w-1.5 rounded-full bg-white/25" />
      <div className="h-1.5 w-1.5 rounded-full bg-white/25" />
    </div>
  );
}

export default function FlipTimer({ targetTime }: { targetTime: string }) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [tl, setTl] = useState({ total: 1, d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    setMounted(true);
    setTl(getTimeLeft(targetTime));
    const i = setInterval(() => setTl(getTimeLeft(targetTime)), 1000);
    return () => clearInterval(i);
  }, [targetTime]);

  if (tl.total <= 0 && mounted) {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#111] px-6 py-4 text-center">
        <p className="text-sm font-bold text-white/60">{t("countdown.locked")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d0d] px-4 py-5 md:px-6">
      <p className="mb-3 text-center text-[9px] font-bold uppercase tracking-[0.25em] text-white/45">
        {t("countdown.closesIn")}
      </p>
      <div className="flex items-start justify-center gap-1" suppressHydrationWarning>
        <FlipDigit value={mounted ? String(tl.d) : "--"} label="Days" />
        <Separator />
        <FlipDigit value={mounted ? String(tl.h) : "--"} label="Hrs" />
        <Separator />
        <FlipDigit value={mounted ? String(tl.m) : "--"} label="Min" />
        <Separator />
        <FlipDigit value={mounted ? String(tl.s) : "--"} label="Sec" />
      </div>
    </div>
  );
}
