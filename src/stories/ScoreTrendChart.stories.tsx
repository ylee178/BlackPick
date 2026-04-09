"use client";

import type { Meta } from "@storybook/nextjs-vite";
import { ScoreTrendChart } from "@/components/ScoreTrendChart";
import { retroPanelClassName } from "@/components/ui/retro";

const meta: Meta = {
  title: "Components/ScoreTrendChart",
  parameters: { layout: "centered" },
};
export default meta;

/* Mock trend data — 14 fights with mix of wins and losses */
const mockPoints = [
  { date: "2026-01-10", score: 8, cumulative: 8, isWin: true, detail: "Winner + Method" },
  { date: "2026-01-17", score: 5, cumulative: 13, isWin: true, detail: "Winner only" },
  { date: "2026-01-24", score: -2, cumulative: 11, isWin: false, detail: "Wrong pick" },
  { date: "2026-02-01", score: 12, cumulative: 23, isWin: true, detail: "Winner + Method + Round" },
  { date: "2026-02-08", score: 5, cumulative: 28, isWin: true, detail: "Winner only" },
  { date: "2026-02-15", score: -2, cumulative: 26, isWin: false, detail: "Wrong pick" },
  { date: "2026-02-22", score: 8, cumulative: 34, isWin: true, detail: "Winner + Method" },
  { date: "2026-03-01", score: -2, cumulative: 32, isWin: false, detail: "Wrong pick" },
  { date: "2026-03-08", score: 5, cumulative: 37, isWin: true, detail: "Winner only" },
  { date: "2026-03-15", score: 8, cumulative: 45, isWin: true, detail: "Winner + Method" },
  { date: "2026-03-22", score: -2, cumulative: 43, isWin: false, detail: "Wrong pick" },
  { date: "2026-03-29", score: 5, cumulative: 48, isWin: true, detail: "Winner only" },
];

/* Mostly losses — negative trend */
const losingStreak = [
  { date: "2026-01-10", score: 5, cumulative: 5, isWin: true },
  { date: "2026-01-17", score: -2, cumulative: 3, isWin: false },
  { date: "2026-01-24", score: -2, cumulative: 1, isWin: false },
  { date: "2026-02-01", score: -2, cumulative: -1, isWin: false },
  { date: "2026-02-08", score: -2, cumulative: -3, isWin: false },
  { date: "2026-02-15", score: 5, cumulative: 2, isWin: true },
  { date: "2026-02-22", score: -2, cumulative: 0, isWin: false },
  { date: "2026-03-01", score: -2, cumulative: -2, isWin: false },
  { date: "2026-03-08", score: -2, cumulative: -4, isWin: false },
  { date: "2026-03-15", score: -2, cumulative: -6, isWin: false },
];

/* ── Upward trend (typical successful user) ── */
export const UpwardTrend = () => (
  <div className={retroPanelClassName({ className: "w-[600px] p-4" })}>
    <ScoreTrendChart points={mockPoints} label="Score Trend" />
  </div>
);

/* ── With period comparison ── */
export const WithPeriodComparison = () => (
  <div className={retroPanelClassName({ className: "w-[600px] p-4" })}>
    <ScoreTrendChart
      points={mockPoints}
      label="3M Score Trend"
      prevScore={22}
      prevRangeLabel="vs prev 3M"
    />
  </div>
);

/* ── Downward trend (losing streak) ── */
export const DownwardTrend = () => (
  <div className={retroPanelClassName({ className: "w-[600px] p-4" })}>
    <ScoreTrendChart points={losingStreak} label="Score Trend" />
  </div>
);
