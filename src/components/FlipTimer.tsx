"use client";

import { Info, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useClockTick } from "@/lib/use-sync-store";

type TimeLeft = { total: number; d: number; h: number; m: number; s: number };

const EMPTY_TIME_LEFT: TimeLeft = { total: 1, d: 0, h: 0, m: 0, s: 0 };

function getTimeLeft(target: string, nowMs: number): TimeLeft {
  const diff = new Date(target).getTime() - nowMs;
  if (diff <= 0) return { total: 0, d: 0, h: 0, m: 0, s: 0 };
  return {
    total: diff,
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

export function DigitCard({ value, label }: { value: string; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="lcd-digit">
        <span>{value}</span>
      </div>
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">
        {label}
      </span>
    </div>
  );
}

/**
 * Pure countdown timer. The absolute date/time and the timezone picker
 * now live in the EventDateLine subtext under the event title, so this
 * component is intentionally just the LCD-style countdown digits.
 *
 * `postLockMessageKey` controls the i18n key rendered when the timer
 * burns out to 00:00:00. Defaults to the canonical
 * `countdown.eventInProgress` for the live-event case; upcoming-with-
 * stale-seed-data callers should pass `countdown.eventStartingSoon`
 * so the copy doesn't contradict the UPCOMING badge. See
 * `derivePostLockTimerState` in `@/lib/event-ui-state`.
 */
export default function FlipTimer({
  targetTime,
  postLockMessageKey = "countdown.eventInProgress",
}: {
  targetTime: string;
  postLockMessageKey?: "countdown.eventInProgress" | "countdown.eventStartingSoon";
}) {
  const { t } = useI18n();
  // Shared 1Hz external store — returns 0 before hydration, then live
  // Date.now() values. See `src/lib/use-sync-store.ts` for the rationale.
  const now = useClockTick();
  const mounted = now !== 0;
  const tl = mounted ? getTimeLeft(targetTime, now) : EMPTY_TIME_LEFT;

  const pad = (n: number) => String(n).padStart(2, "0");

  // Burned-out post-lock state: keep the LCD timer mounted at 00:00:00
  // with dimmed digits so the "event started, timer spent" feeling is
  // preserved in place, rather than swapping the card out for a plain
  // text block. Sean's 2026-04-13 refinement: "타이머 00 00 00이 되면
  // 불이꺼진 타이머가 그대로잇고".
  if (tl.total <= 0 && mounted) {
    return (
      <div>
        <div className="rounded-[12px] bg-[#060606] px-6 py-6">
          <p className="gold-dim-pulse mb-2 text-center text-xs font-semibold uppercase tracking-[0.12em]">
            {t(postLockMessageKey)}
          </p>
          {/* `lcd-dim` cascades to .lcd-digit span + .lcd-colon
              inside, turning the digits subtle gray instead of gold.
              No opacity dim needed — the color override is self
              contained. */}
          <div className="lcd-dim flex items-start justify-center gap-1.5 sm:gap-2">
            <DigitCard value="00" label={t("countdown.daysShort")} />
            <span className="lcd-colon">:</span>
            <DigitCard value="00" label={t("countdown.hoursShort")} />
            <span className="lcd-colon">:</span>
            <DigitCard value="00" label={t("countdown.minutesShort")} />
            <span className="lcd-colon">:</span>
            <DigitCard value="00" label={t("countdown.secondsShort")} />
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--bp-muted)]">
            <Lock
              className="h-3 w-3 shrink-0 text-[var(--bp-danger)]"
              strokeWidth={2}
              aria-hidden
            />
            <span>{t("countdown.locked")}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-[12px] bg-[#060606] px-6 py-6">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--bp-muted)]">
          {t("countdown.eventStartsIn")}
        </p>
        <div
          className="flex items-start justify-center gap-1.5 sm:gap-2"
          suppressHydrationWarning
        >
          <DigitCard
            value={mounted ? pad(tl.d) : "--"}
            label={t("countdown.daysShort")}
          />
          <span className="lcd-colon">:</span>
          <DigitCard
            value={mounted ? pad(tl.h) : "--"}
            label={t("countdown.hoursShort")}
          />
          <span className="lcd-colon">:</span>
          <DigitCard
            value={mounted ? pad(tl.m) : "--"}
            label={t("countdown.minutesShort")}
          />
          <span className="lcd-colon">:</span>
          <DigitCard
            value={mounted ? pad(tl.s) : "--"}
            label={t("countdown.secondsShort")}
          />
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--bp-muted)]">
          <Info className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
          <span>{t("countdown.lockedHint")}</span>
        </p>
      </div>
    </div>
  );
}
