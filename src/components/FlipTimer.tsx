"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";
import TimezoneSelect from "@/components/TimezoneSelect";
import { useTimezone } from "@/lib/use-timezone";
import { formatTimeInTimezone } from "@/lib/timezone";

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

export default function FlipTimer({ targetTime }: { targetTime: string }) {
  const { t, locale } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [tl, setTl] = useState({ total: 1, d: 0, h: 0, m: 0, s: 0 });

  // Timezone state is owned by the shared `useTimezone` hook so the timer
  // and any other surface (e.g. EventDateLine subtext) stay in sync when
  // the user changes their preference here.
  const { tz: selectedTz, detected: detectedTz, setTz: handleTimezoneChange } = useTimezone();

  useEffect(() => {
    setMounted(true);
    setTl(getTimeLeft(targetTime));
    const i = setInterval(() => setTl(getTimeLeft(targetTime)), 1000);
    return () => clearInterval(i);
  }, [targetTime]);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (tl.total <= 0 && mounted) {
    return (
      <div className="rounded-[12px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-4 py-4 text-center">
        <p className="text-sm font-semibold text-[var(--bp-muted)]">{t("countdown.locked")}</p>
      </div>
    );
  }

  const localTime =
    mounted && selectedTz
      ? formatTimeInTimezone(targetTime, selectedTz, locale)
      : "";

  return (
    <div>
      <div className="rounded-[12px] bg-[#060606] px-6 py-6">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--bp-muted)]">
          {t("countdown.closesIn")}
        </p>
        <div className="flex items-start justify-center gap-1.5 sm:gap-2" suppressHydrationWarning>
          <DigitCard value={mounted ? pad(tl.d) : "--"} label={t("countdown.daysShort")} />
          <span className="lcd-colon">:</span>
          <DigitCard value={mounted ? pad(tl.h) : "--"} label={t("countdown.hoursShort")} />
          <span className="lcd-colon">:</span>
          <DigitCard value={mounted ? pad(tl.m) : "--"} label={t("countdown.minutesShort")} />
          <span className="lcd-colon">:</span>
          <DigitCard value={mounted ? pad(tl.s) : "--"} label={t("countdown.secondsShort")} />
        </div>

        {/* Absolute time + timezone picker, stacked vertically so a long
            localized date string and the dropdown never compete for
            horizontal space inside a narrow timer card. Only renders
            after hydration so we never flash a misleading initial time. */}
        <div
          className="mt-3 flex flex-col items-center gap-1.5"
          suppressHydrationWarning
        >
          {mounted && selectedTz ? (
            <>
              <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--bp-muted)]">
                {localTime}
              </span>
              <TimezoneSelect
                value={selectedTz}
                detected={detectedTz ?? selectedTz}
                onChange={handleTimezoneChange}
                locale={locale}
                ariaLabel={t("countdown.selectTimezone")}
              />
            </>
          ) : (
            <span className="text-[11px] uppercase text-[var(--bp-muted)]">
              {/* Placeholder keeps the layout stable between SSR and client hydrate. */}
              &nbsp;
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
