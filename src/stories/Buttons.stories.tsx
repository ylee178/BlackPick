import type { Meta } from "@storybook/nextjs-vite";
import { retroButtonClassName, retroSegmentClassName } from "@/components/ui/retro";
import { Ticket, Play, Pencil, MessageCircle } from "lucide-react";

const meta: Meta = {
  title: "Design System/Buttons",
  parameters: { layout: "centered" },
};
export default meta;

export const AllVariants = () => (
  <div className="flex flex-col gap-6">
    <div>
      <p className="mb-2 text-xs text-white/50">Primary</p>
      <div className="flex items-center gap-2">
        <button className={retroButtonClassName({ variant: "primary", size: "sm" })}>Small</button>
        <button className={retroButtonClassName({ variant: "primary" })}>Medium</button>
        <button className={retroButtonClassName({ variant: "primary", size: "lg" })}>Large</button>
      </div>
    </div>
    <div>
      <p className="mb-2 text-xs text-white/50">Secondary</p>
      <div className="flex items-center gap-2">
        <button className={retroButtonClassName({ variant: "secondary", size: "sm" })}>Small</button>
        <button className={retroButtonClassName({ variant: "secondary" })}>Medium</button>
        <button className={retroButtonClassName({ variant: "secondary", size: "lg" })}>Large</button>
      </div>
    </div>
    <div>
      <p className="mb-2 text-xs text-white/50">Ghost</p>
      <div className="flex items-center gap-2">
        <button className={retroButtonClassName({ variant: "ghost", size: "sm" })}>Small</button>
        <button className={retroButtonClassName({ variant: "ghost" })}>Medium</button>
        <button className={retroButtonClassName({ variant: "ghost", size: "lg" })}>Large</button>
      </div>
    </div>
    <div>
      <p className="mb-2 text-xs text-white/50">Soft (pill)</p>
      <div className="flex items-center gap-2">
        <button className={retroButtonClassName({ variant: "soft", size: "sm" })}>
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} /> Discussion
        </button>
        <button className={retroButtonClassName({ variant: "soft" })}>
          <MessageCircle className="h-4 w-4" strokeWidth={2} /> Discussion
        </button>
        <button className={retroButtonClassName({ variant: "soft", size: "lg" })}>
          <MessageCircle className="h-4 w-4" strokeWidth={2} /> Discussion
        </button>
      </div>
    </div>
    <div>
      <p className="mb-2 text-xs text-white/50">With Icons</p>
      <div className="flex items-center gap-2">
        <button className={retroButtonClassName({ variant: "primary", size: "sm" })}>
          <Ticket className="h-4 w-4" strokeWidth={1.5} /> Buy Tickets
        </button>
        <button className={retroButtonClassName({ variant: "secondary", size: "sm" })}>
          <Play className="h-4 w-4" strokeWidth={1.5} /> Watch Live
        </button>
        <button className={retroButtonClassName({ variant: "ghost", size: "sm" })}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Edit
        </button>
      </div>
    </div>
  </div>
);

export const Segments = () => (
  <div>
    <p className="mb-2 text-xs text-white/50">Segmented Control</p>
    <div className="flex gap-1.5">
      <span className={retroSegmentClassName({ active: true })}>All-Time</span>
      <span className={retroSegmentClassName({ active: false })}>By League</span>
      <span className={retroSegmentClassName({ active: false })}>Win Streak</span>
    </div>
  </div>
);

export const BlockButton = () => (
  <div className="w-80">
    <button className={retroButtonClassName({ variant: "primary", size: "lg", block: true })}>
      Full Width Button
    </button>
  </div>
);
