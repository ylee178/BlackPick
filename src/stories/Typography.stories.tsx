import type { Meta } from "@storybook/nextjs-vite";

const meta: Meta = {
  title: "Design System/Typography",
  parameters: { layout: "centered" },
};
export default meta;

export const TypeScale = () => (
  <div className="flex flex-col gap-5 w-[500px]">
    <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
      <span className="text-4xl font-bold text-white">Page Title</span>
      <span className="text-xs text-white/30">32px / text-4xl / bold</span>
    </div>
    <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
      <span className="text-2xl font-semibold text-white">Section Header</span>
      <span className="text-xs text-white/30">24px / text-2xl / semibold</span>
    </div>
    <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
      <span className="text-xl font-semibold text-white">Card Title</span>
      <span className="text-xs text-white/30">20px / text-xl / semibold</span>
    </div>
    <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
      <span className="text-lg font-bold tabular-nums text-white">1,250 pts</span>
      <span className="text-xs text-white/30">18px / text-lg / bold (stats)</span>
    </div>
    <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
      <span className="text-base text-white">Body text for descriptions and content</span>
      <span className="text-xs text-white/30">16px / text-base / regular</span>
    </div>
    <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
      <span className="text-sm font-medium text-white/70">Label / secondary text</span>
      <span className="text-xs text-white/30">14px / text-sm / medium</span>
    </div>
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-white/50">Caption — minimum size</span>
      <span className="text-xs text-white/30">12px / text-xs / regular</span>
    </div>
  </div>
);

export const ColorTokens = () => (
  <div className="flex flex-col gap-3 w-80">
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded bg-[var(--bp-accent)]" />
      <span className="text-sm text-white">--bp-accent (#ffba3c)</span>
    </div>
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded bg-[var(--bp-ink)]" />
      <span className="text-sm text-white">--bp-ink (white)</span>
    </div>
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded bg-[var(--bp-muted)]" />
      <span className="text-sm text-white">--bp-muted (white/50)</span>
    </div>
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded bg-[var(--bp-success)]" />
      <span className="text-sm text-white">--bp-success (green)</span>
    </div>
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded bg-[var(--bp-danger)]" />
      <span className="text-sm text-white">--bp-danger (red)</span>
    </div>
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded bg-[var(--bp-bg)]" />
      <span className="text-sm text-white">--bp-bg (#050505)</span>
    </div>
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded border border-white/10 bg-[var(--bp-card)]" />
      <span className="text-sm text-white">--bp-card (#0d0d0d)</span>
    </div>
  </div>
);
