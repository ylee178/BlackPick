"use client";

import { useEffect, useState } from "react";

export default function CountdownRing({ days, date }: { days: number; date: string }) {
  const [mounted, setMounted] = useState(false);
  const [d, setD] = useState(days);

  useEffect(() => {
    setMounted(true);
    const update = () => {
      const diff = new Date(date).getTime() - Date.now();
      setD(Math.max(0, Math.ceil(diff / 86400000)));
    };
    update();
    const i = setInterval(update, 60000);
    return () => clearInterval(i);
  }, [date]);

  const pct = Math.max(0, Math.min(100, ((30 - d) / 30) * 100));
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,186,60,0.1)" strokeWidth="4" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke="#ffba3c"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={mounted ? offset : circ}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="text-center" suppressHydrationWarning>
        <p className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
          {mounted ? d : "--"}
        </p>
        <p className="text-[9px] uppercase tracking-wider text-white/45">Days</p>
      </div>
    </div>
  );
}
