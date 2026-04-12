"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { useClockTick } from "@/lib/use-sync-store";

/* ── Single flip card ── */
type FlipState = {
  current: string;
  prev: string;
  flipping: boolean;
  // Stored in state (not a ref) so the "adjusting state during render"
  // pattern stays compliant with `react-hooks/refs`, which forbids reading
  // or writing `ref.current` during render. See
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders.
  lastValue: string;
  // Monotonic counter incremented on every value change. Used as an
  // effect dep so the 600ms reset timer is restarted whenever a new
  // value arrives mid-flip — without this, two value changes within
  // 600ms would share a single timeout and the second flap would clear
  // its `flipping` flag too early.
  flipId: number;
};

function FlipCard({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<FlipState>(() => ({
    current: value,
    prev: value,
    flipping: false,
    lastValue: value,
    flipId: 0,
  }));

  // Canonical "derive state from props" pattern: when the incoming value
  // diverges from the snapshot we last processed, schedule a state update
  // during render. React throws away this render output and re-runs the
  // component with the updated snapshot — no `useEffect` / setState hop,
  // and therefore no `react-hooks/set-state-in-effect` violation.
  if (state.lastValue !== value) {
    setState((prev) => ({
      current: value,
      prev: prev.current,
      flipping: true,
      lastValue: value,
      flipId: prev.flipId + 1,
    }));
  }

  const { current, prev, flipping, flipId } = state;

  useEffect(() => {
    if (!flipping) return;
    // Async setState via setTimeout — runs on the event loop *after* the
    // effect commits, so it doesn't trip `set-state-in-effect`. The
    // `flipId` dep ensures we restart the timer for every new value,
    // even if `flipping` was already true.
    const id = setTimeout(() => {
      setState((s) => (s.flipId === flipId ? { ...s, flipping: false } : s));
    }, 600);
    return () => clearTimeout(id);
  }, [flipping, flipId]);

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

export default function FlipClock({ targetTime }: { targetTime: string }) {
  const { t } = useI18n();
  // `useClockTick` returns 0 during SSR / first client paint and then a live
  // `Date.now()` value via a shared 1Hz store. The `now === 0` sentinel
  // doubles as our "not yet hydrated" flag, replacing the old
  // `useState(mounted)` + `useEffect(() => setMounted(true), [])` pair.
  const now = useClockTick();
  const mounted = now !== 0;
  const tl = mounted ? getTimeLeft(targetTime, now) : EMPTY_TIME_LEFT;

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
