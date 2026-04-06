"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";

/* ── Single flip card ── */
function FlipCard({ value, label }: { value: string; label: string }) {
  const [current, setCurrent] = useState(value);
  const [prev, setPrev] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (value !== current) {
      setPrev(current);
      setCurrent(value);
      setFlipping(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setFlipping(false), 600);
    }
  }, [value, current]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flip-card">
        {/* Static top half — shows NEW value */}
        <div className="flip-card-top">
          <span>{current}</span>
        </div>

        {/* Static bottom half — shows OLD value, then NEW after flip */}
        <div className="flip-card-bottom">
          <span>{flipping ? prev : current}</span>
        </div>

        {/* Animated flap: top half flips down */}
        <div className={`flip-card-flap-top ${flipping ? "flip-animate" : ""}`}>
          <span>{prev}</span>
        </div>

        {/* Animated flap: bottom half flips up (back face) */}
        <div className={`flip-card-flap-bottom ${flipping ? "flip-animate" : ""}`}>
          <span>{current}</span>
        </div>

        {/* Center divider line */}
        <div className="flip-card-divider" />
      </div>
      <span className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--bp-accent)]">{label}</span>
    </div>
  );
}

/* ── Flip Clock Countdown ── */
function getTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total: diff,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function FlipClock({ targetTime }: { targetTime: string }) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [tl, setTl] = useState({ total: 1, days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    setMounted(true);
    setTl(getTimeLeft(targetTime));
    const i = setInterval(() => setTl(getTimeLeft(targetTime)), 1000);
    return () => clearInterval(i);
  }, [targetTime]);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (tl.total <= 0 && mounted) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4 text-center text-sm font-bold text-white/60">
        {t("countdown.locked")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--bp-accent)]/15 bg-[rgba(255,186,60,0.03)] px-4 py-4">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.15em] text-white/50">
        {t("countdown.closesIn")}
      </p>
      <div className="flex items-start justify-center gap-3" suppressHydrationWarning>
        <FlipCard value={mounted ? pad(tl.days) : "--"} label={t("countdown.daysShort")} />
        <span className="mt-3 text-xl font-bold text-white/20">:</span>
        <FlipCard value={mounted ? pad(tl.hours) : "--"} label={t("countdown.hoursShort")} />
        <span className="mt-3 text-xl font-bold text-white/20">:</span>
        <FlipCard value={mounted ? pad(tl.minutes) : "--"} label={t("countdown.minutesShort")} />
        <span className="mt-3 text-xl font-bold text-white/20">:</span>
        <FlipCard value={mounted ? pad(tl.seconds) : "--"} label={t("countdown.secondsShort")} />
      </div>
    </div>
  );
}
