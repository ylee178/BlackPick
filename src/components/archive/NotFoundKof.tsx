"use client";

import { useState } from "react";
import { Home } from "lucide-react";

/* ── Option 1: Simple/Bold ── */
function Option1() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#060e18] px-4 text-center">
      <p
        className="text-[120px] font-black leading-none tracking-tighter text-[#e5a944] sm:text-[160px]"
        style={{ textShadow: "4px 4px 0 rgba(0,0,0,0.4)" }}
      >
        404
      </p>
      <p className="mt-2 text-lg font-bold text-white">
        Wrong corner. No fight here.
      </p>
      <p className="mt-1 text-sm text-[#666]">
        The page you are looking for does not exist.
      </p>
      <div className="mt-8">
        <a
          href="/"
          className="inline-flex cursor-pointer items-center gap-2 rounded-[12px] border border-[#e5a944] bg-[#e5a944] px-6 py-3 text-sm font-bold text-black transition-all hover:bg-[#f0bd5e]"
        >
          <Home className="h-4 w-4" strokeWidth={2} />
          Back to the ring
        </a>
      </div>
    </div>
  );
}

/* ── Option 2: KOF Arcade ── */
function KofPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[4px] border-2 border-[#3a5a8a] bg-gradient-to-b from-[#0c1929] to-[#0a1220] ${className}`}
      style={{ boxShadow: "inset 0 1px 0 rgba(100,160,255,0.15), 0 4px 20px rgba(0,0,0,0.6)" }}
    >
      {children}
    </div>
  );
}

function KofTab({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      className={`flex-1 py-1.5 text-center text-xs font-black uppercase tracking-wider ${
        active
          ? "bg-gradient-to-b from-[#2a6ad4] to-[#1a4a9a] text-white"
          : "bg-gradient-to-b from-[#1a2a44] to-[#0e1a2e] text-[#4a6a8a]"
      }`}
      style={active ? { boxShadow: "inset 0 1px 0 rgba(120,180,255,0.4)" } : {}}
    >
      {label}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-10 shrink-0 text-[11px] font-bold italic text-[#6a9acc]">{label}</span>
      <span className="w-14 shrink-0 text-right text-sm font-black tabular-nums text-white">{value}</span>
      <div className="flex flex-1 gap-[2px]">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-3 flex-1 rounded-[1px] bg-[#1a2a44]" />
        ))}
      </div>
    </div>
  );
}

function Option2() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#060e18] px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="relative">
          <p
            className="text-center text-[80px] font-black leading-none tracking-tight text-[#f87171] sm:text-[100px]"
            style={{
              textShadow: "3px 3px 0 #7f1d1d, -1px -1px 0 #fca5a5, 0 0 40px rgba(248,113,113,0.3)",
              WebkitTextStroke: "2px #991b1b",
            }}
          >
            K.O.
          </p>
          <p
            className="mt-[-8px] text-center text-[48px] font-black leading-none tabular-nums tracking-tighter text-[#e5a944] sm:text-[56px]"
            style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.5), 0 0 20px rgba(229,169,68,0.3)" }}
          >
            404
          </p>
        </div>

        <KofPanel className="w-full">
          <div className="flex border-b border-[#2a4a6a]">
            <KofTab label="STATUS" active />
            <KofTab label="ERROR" />
            <KofTab label="HELP" />
          </div>
          <div className="px-3 pb-3 pt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-black text-white">
                LV. <span className="text-[#e5a944]">0</span>
                <span className="text-[#4a6a8a]"> / 99</span>
              </span>
              <span className="text-[10px] font-bold text-[#4a6a8a]">PAGE NOT FOUND</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#6a9acc]">EXP</span>
              <div className="flex flex-1 gap-[1px] overflow-hidden rounded-[2px] bg-[#0a1220]">
                <div className="h-2 w-0 rounded-[2px]" />
              </div>
              <span className="text-[10px] font-bold tabular-nums text-[#4a6a8a]">0%</span>
            </div>
            <div className="my-2 border-t border-[#1a2a44]" />
            <StatRow label="HP" value="0" />
            <StatRow label="ATK" value="—" />
            <StatRow label="DEF" value="—" />
            <div className="my-2 border-t border-[#1a2a44]" />
            <div className="rounded-[3px] border border-[#2a4a6a] bg-[#0a1220] px-3 py-2">
              <p className="text-xs font-bold text-[#f87171]">ROUND ERROR</p>
              <p className="mt-0.5 text-[11px] text-[#4a6a8a]">This page has been knocked out.</p>
            </div>
          </div>
        </KofPanel>

        <a
          href="/"
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[4px] border-2 border-[#22c55e] bg-gradient-to-b from-[#22c55e] to-[#16a34a] px-6 py-3 text-sm font-black uppercase tracking-wider text-white transition-all hover:from-[#4ade80] hover:to-[#22c55e]"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 12px rgba(34,197,94,0.3)" }}
        >
          <Home className="h-4 w-4" strokeWidth={2.5} />
          CONTINUE?
        </a>
      </div>
    </div>
  );
}

/* ── Toggle wrapper ── */
export default function NotFoundToggle() {
  const [option, setOption] = useState<1 | 2>(2);

  return (
    <div className="relative">
      {/* Toggle buttons - fixed top center */}
      <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 gap-1 rounded-[8px] border border-[#333] bg-[#111] p-1">
        <button
          onClick={() => setOption(1)}
          className={`cursor-pointer rounded-[6px] px-4 py-1.5 text-xs font-bold transition-all ${
            option === 1
              ? "bg-[#e5a944] text-black"
              : "text-[#666] hover:text-white"
          }`}
        >
          Option 1
        </button>
        <button
          onClick={() => setOption(2)}
          className={`cursor-pointer rounded-[6px] px-4 py-1.5 text-xs font-bold transition-all ${
            option === 2
              ? "bg-[#e5a944] text-black"
              : "text-[#666] hover:text-white"
          }`}
        >
          Option 2
        </button>
      </div>

      {option === 1 ? <Option1 /> : <Option2 />}
    </div>
  );
}
