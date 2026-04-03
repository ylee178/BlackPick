"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";

type CountdownTimerProps = {
  targetTime: string;
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

export default function CountdownTimer({ targetTime }: CountdownTimerProps) {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    getTimeLeft(targetTime)
  );

  useEffect(() => {
    setTimeLeft(getTimeLeft(targetTime));
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(targetTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  const isLocked = timeLeft.total <= 0;

  const countdownText = useMemo(() => {
    const { days, hours, minutes, seconds } = timeLeft;
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }, [timeLeft]);

  if (isLocked) {
    return (
      <div className="mt-4 flex items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
        🔒 {t("countdown.locked")}
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center justify-center rounded-xl border border-amber-400/20 bg-gray-900/80 px-4 py-3 text-sm">
      <span className="mr-2">⏱️</span>
      <span className="text-gray-300">{t("countdown.closesIn")}</span>
      <span className="ml-2 font-mono font-semibold tracking-wide text-amber-400" suppressHydrationWarning>
        {countdownText}
      </span>
    </div>
  );
}
