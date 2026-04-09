"use client";

import type { Meta } from "@storybook/nextjs-vite";
import { withI18n } from "./decorators";
import { RetroStatusBadge } from "@/components/ui/retro";
import { Clock } from "lucide-react";

const meta: Meta = {
  title: "Components/StickyEventHeader",
  parameters: { layout: "fullscreen" },
  decorators: [withI18n],
};
export default meta;

/*
 * StickyEventHeader uses IntersectionObserver and DOM measurement,
 * so we render a static mock that shows its visual layout.
 */

function MockStickyHeader({
  eventName,
  status,
  tone,
  countdown,
}: {
  eventName: string;
  status: string;
  tone: "info" | "danger" | "success";
  countdown?: string;
}) {
  return (
    <div className="border-b border-[var(--bp-line)] bg-[var(--bp-bg-translucent)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[44px] max-w-[1200px] items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0">
            <RetroStatusBadge tone={tone}>{status}</RetroStatusBadge>
          </div>
          <p className="min-w-0 truncate text-sm font-bold leading-none text-[var(--bp-ink)]">{eventName}</p>
        </div>
        {countdown ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Clock className="mr-1 h-[18px] w-[18px] text-[var(--bp-accent)]" strokeWidth={2} />
            {countdown.split(":").map((seg, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && <span className="lcd-colon-mini">:</span>}
                <span className="lcd-digit-mini">{seg}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const Upcoming = () => (
  <div className="flex flex-col gap-4 p-4">
    <p className="text-xs text-white/50">Upcoming event with countdown</p>
    <MockStickyHeader
      eventName="Black Combat 13: Judgement Day"
      status="Upcoming"
      tone="info"
      countdown="07:14:32:08"
    />
  </div>
);

export const Live = () => (
  <div className="flex flex-col gap-4 p-4">
    <p className="text-xs text-white/50">Live event (no countdown)</p>
    <MockStickyHeader
      eventName="Black Combat 12: Rising"
      status="Live"
      tone="danger"
    />
  </div>
);

export const Completed = () => (
  <div className="flex flex-col gap-4 p-4">
    <p className="text-xs text-white/50">Completed event</p>
    <MockStickyHeader
      eventName="Black Combat 11: First Blood"
      status="Completed"
      tone="success"
    />
  </div>
);

export const LongEventName = () => (
  <div className="flex flex-col gap-4 p-4">
    <p className="text-xs text-white/50">Long name truncation</p>
    <MockStickyHeader
      eventName="Black Combat 14: Championship Night — The Ultimate Showdown of Champions"
      status="Upcoming"
      tone="info"
      countdown="02:08:15:42"
    />
  </div>
);
