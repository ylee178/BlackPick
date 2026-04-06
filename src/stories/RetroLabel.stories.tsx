import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RetroLabel, RetroStatusBadge, retroChipClassName } from "@/components/ui/retro";
import { Check, Flame } from "lucide-react";

const meta: Meta<typeof RetroLabel> = {
  title: "Design System/RetroLabel",
  component: RetroLabel,
  parameters: { layout: "centered" },
  argTypes: {
    size: { control: "radio", options: ["sm", "md"] },
    tone: { control: "radio", options: ["accent", "success", "danger", "info", "neutral", "gold"] },
  },
};
export default meta;

type Story = StoryObj<typeof RetroLabel>;

export const Playground: Story = {
  args: { children: "Label", size: "sm", tone: "accent" },
};

/* ── Size Comparison ── */
export const SizeComparison = () => (
  <div className="flex flex-col gap-6">
    <div>
      <p className="mb-2 text-xs text-white/50">sm (22px) — inline tags, single-use</p>
      <div className="flex flex-wrap items-center gap-2">
        <RetroLabel size="sm" tone="accent">NEW</RetroLabel>
        <RetroLabel size="sm" tone="success">LIVE</RetroLabel>
        <RetroLabel size="sm" tone="success" icon={<Check className="h-3 w-3" strokeWidth={2.5} />}>My Pick</RetroLabel>
        <RetroLabel size="sm" tone="gold">Win</RetroLabel>
        <RetroLabel size="sm" tone="neutral">Skipped</RetroLabel>
      </div>
    </div>
    <div>
      <p className="mb-2 text-xs text-white/50">md (26px) — status badges, chips, side-by-side</p>
      <div className="flex flex-wrap items-center gap-2">
        <RetroLabel size="md" tone="info">Upcoming</RetroLabel>
        <RetroLabel size="md" tone="danger">Live</RetroLabel>
        <RetroLabel size="md" tone="success">Completed</RetroLabel>
        <RetroLabel size="md" tone="neutral">Lightweight</RetroLabel>
        <RetroLabel size="md" tone="neutral">Black Cup</RetroLabel>
        <RetroLabel size="md" tone="accent">MAIN EVENT</RetroLabel>
      </div>
    </div>
  </div>
);

/* ── All Tones ── */
export const AllTones = () => (
  <div className="flex flex-col gap-4">
    {(["accent", "success", "danger", "info", "neutral", "gold"] as const).map((tone) => (
      <div key={tone} className="flex items-center gap-3">
        <span className="w-16 text-xs text-white/40">{tone}</span>
        <RetroLabel size="sm" tone={tone}>sm</RetroLabel>
        <RetroLabel size="md" tone={tone}>md</RetroLabel>
      </div>
    ))}
  </div>
);

/* ── With Icons ── */
export const WithIcons = () => (
  <div className="flex flex-col gap-4">
    <div>
      <p className="mb-2 text-xs text-white/50">sm — standalone icon labels (fighter card overlay)</p>
      <div className="flex flex-wrap items-center gap-2">
        <RetroLabel size="sm" tone="success" icon={<Check className="h-3 w-3" strokeWidth={2} />}>My Pick</RetroLabel>
        <RetroLabel size="sm" tone="gold">Win</RetroLabel>
      </div>
    </div>
    <div>
      <p className="mb-2 text-xs text-white/50">md — inline with other md labels</p>
      <div className="flex flex-wrap items-center gap-2">
        <RetroLabel size="md" tone="accent" icon={<Flame className="h-3.5 w-3.5" strokeWidth={2} />}>Streak</RetroLabel>
        <RetroLabel size="md" tone="accent">MAIN EVENT</RetroLabel>
        <RetroLabel size="md" tone="info">Upcoming</RetroLabel>
        <RetroLabel size="md" tone="neutral">Lightweight</RetroLabel>
      </div>
    </div>
    <div>
      <p className="mb-2 text-xs text-white/50">Icon size rule: sm = h-3 (12px), md = h-3.5 (14px)</p>
    </div>
  </div>
);

/* ── RetroStatusBadge (wrapper) ── */
export const StatusBadgeWrapper = () => (
  <div>
    <p className="mb-2 text-xs text-white/50">RetroStatusBadge = RetroLabel md</p>
    <div className="flex flex-wrap items-center gap-2">
      <RetroStatusBadge tone="info">Upcoming</RetroStatusBadge>
      <RetroStatusBadge tone="danger">Live</RetroStatusBadge>
      <RetroStatusBadge tone="success">Completed</RetroStatusBadge>
      <RetroStatusBadge tone="neutral">Cancelled</RetroStatusBadge>
    </div>
  </div>
);

/* ── retroChipClassName (class-based) ── */
export const ChipClassName = () => (
  <div>
    <p className="mb-2 text-xs text-white/50">retroChipClassName = RetroLabel md classes</p>
    <div className="flex flex-wrap items-center gap-2">
      <span className={retroChipClassName({ tone: "neutral" })}>Lightweight</span>
      <span className={retroChipClassName({ tone: "neutral" })}>Black Cup</span>
      <span className={retroChipClassName({ tone: "accent" })}>2 LIVE</span>
    </div>
  </div>
);

/* ── Side-by-side consistency check ── */
export const InlineConsistency = () => (
  <div className="flex flex-col gap-4">
    <div>
      <p className="mb-2 text-xs text-white/50">Fight Card header — all md, same height</p>
      <div className="flex flex-wrap items-center gap-2">
        <RetroStatusBadge tone="info">Upcoming</RetroStatusBadge>
        <span className={retroChipClassName({ tone: "neutral" })}>Lightweight</span>
        <span className={retroChipClassName({ tone: "neutral" })}>Numbering</span>
        <RetroLabel size="md" tone="accent">MAIN EVENT</RetroLabel>
      </div>
    </div>
    <div>
      <p className="mb-2 text-xs text-white/50">Hero header — status + series</p>
      <div className="flex flex-wrap items-center gap-2">
        <RetroStatusBadge tone="info">Upcoming</RetroStatusBadge>
        <span className={retroChipClassName({ tone: "neutral" })}>Black Cup</span>
        <span className="text-xs text-white/50">2026-04-12</span>
      </div>
    </div>
    <div>
      <p className="mb-2 text-xs text-white/50">Cancelled / No Contest states</p>
      <div className="flex flex-wrap items-center gap-2">
        <RetroStatusBadge tone="neutral">Cancelled</RetroStatusBadge>
        <span className={retroChipClassName({ tone: "neutral" })}>Heavyweight</span>
      </div>
    </div>
    <div>
      <p className="mb-2 text-xs text-white/50">Result badges (standalone sm)</p>
      <div className="flex flex-wrap items-center gap-2">
        <RetroStatusBadge tone="success">Win +8pt</RetroStatusBadge>
        <RetroStatusBadge tone="danger">Loss -2pt</RetroStatusBadge>
        <RetroStatusBadge tone="neutral">Pending</RetroStatusBadge>
      </div>
    </div>
  </div>
);
