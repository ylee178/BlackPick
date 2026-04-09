"use client";

import type { Meta } from "@storybook/nextjs-vite";

const meta: Meta = {
  title: "Design System/Timer",
  parameters: { layout: "centered" },
};
export default meta;

/* Show the raw LCD digit styles without the full FlipTimer (which needs i18n context) */
export const LcdDigits = () => (
  <div className="flex flex-col items-center gap-6">
    <p className="text-xs text-white/50">LCD Digital Clock Digits</p>
    <div className="rounded-[12px] bg-[#060606] px-6 py-6">
      <div className="flex items-start justify-center gap-2">
        <div className="flex flex-col items-center gap-1.5">
          <div className="lcd-digit"><span>07</span></div>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">Days</span>
        </div>
        <span className="lcd-colon">:</span>
        <div className="flex flex-col items-center gap-1.5">
          <div className="lcd-digit"><span>14</span></div>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">Hrs</span>
        </div>
        <span className="lcd-colon">:</span>
        <div className="flex flex-col items-center gap-1.5">
          <div className="lcd-digit"><span>32</span></div>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">Min</span>
        </div>
        <span className="lcd-colon">:</span>
        <div className="flex flex-col items-center gap-1.5">
          <div className="lcd-digit"><span>08</span></div>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">Sec</span>
        </div>
      </div>
    </div>

    <p className="text-xs text-white/50">Mini (Sticky Header)</p>
    <div className="flex items-center gap-1.5 rounded-[8px] bg-[#0a0a0a] px-3 py-2">
      <span className="lcd-digit-mini">07</span>
      <span className="lcd-colon-mini">:</span>
      <span className="lcd-digit-mini">14</span>
      <span className="lcd-colon-mini">:</span>
      <span className="lcd-digit-mini">32</span>
      <span className="lcd-colon-mini">:</span>
      <span className="lcd-digit-mini">08</span>
    </div>
  </div>
);
