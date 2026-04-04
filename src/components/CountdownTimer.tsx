"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";

type Props = { targetTime: string };

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

export default function CountdownTimer({ targetTime }: Props) {
  const { t } = useI18n();
  const [tl, setTl] = useState(() => getTimeLeft(targetTime));

  useEffect(() => {
    setTl(getTimeLeft(targetTime));
    const i = setInterval(() => setTl(getTimeLeft(targetTime)), 1000);
    return () => clearInterval(i);
  }, [targetTime]);

  const text = useMemo(() => {
    if (tl.days > 0) return `${tl.days}d ${tl.hours}h ${tl.minutes}m ${tl.seconds}s`;
    if (tl.hours > 0) return `${tl.hours}h ${tl.minutes}m ${tl.seconds}s`;
    return `${tl.minutes}m ${tl.seconds}s`;
  }, [tl]);

  if (tl.total <= 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-center text-sm font-bold text-white/60">
        {t("countdown.locked")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#ffba3c]/15 bg-[#ffba3c]/[0.03] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">{t("countdown.closesIn")}</p>
      <p
        className="mt-1 text-2xl font-black text-[#ffba3c]"
        style={{ fontFamily: "var(--font-display)" }}
        suppressHydrationWarning
      >
        {text}
      </p>
    </div>
  );
}
