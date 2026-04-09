"use client";

import type { Meta } from "@storybook/nextjs-vite";
import FlipTimer from "@/components/FlipTimer";
import FlipClock from "@/components/FlipClock";
import { withI18n } from "./decorators";

const meta: Meta = {
  title: "Components/FlipTimer",
  parameters: { layout: "centered" },
  decorators: [withI18n],
};
export default meta;

/* Target 7 days from now so the countdown is always active */
const futureTarget = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

/* Target in the past to show the "locked" state */
const pastTarget = new Date(Date.now() - 60 * 1000).toISOString();

/* ── LCD-style FlipTimer (used on event detail hero) ── */
export const LcdCountdown = () => (
  <div className="w-[420px]">
    <FlipTimer targetTime={futureTarget} />
  </div>
);

/* ── LCD timer — expired / locked state ── */
export const LcdExpired = () => (
  <div className="w-[420px]">
    <FlipTimer targetTime={pastTarget} />
  </div>
);

/* ── Mechanical FlipClock (alternative style) ── */
export const MechanicalFlipClock = () => (
  <div className="w-[420px]">
    <FlipClock targetTime={futureTarget} />
  </div>
);

/* ── FlipClock — expired ── */
export const MechanicalFlipClockExpired = () => (
  <div className="w-[420px]">
    <FlipClock targetTime={pastTarget} />
  </div>
);
