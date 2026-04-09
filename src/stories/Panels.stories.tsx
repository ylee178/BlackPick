import type { Meta } from "@storybook/nextjs-vite";
import { retroPanelClassName, retroInsetClassName, RetroEmptyState, RetroStatTile, retroButtonClassName } from "@/components/ui/retro";

const meta: Meta = {
  title: "Design System/Panels",
  parameters: { layout: "centered" },
};
export default meta;

export const PanelTones = () => (
  <div className="flex flex-col gap-4 w-80">
    <div className={retroPanelClassName({ className: "p-4" })}>
      <p className="text-sm text-white">Default Panel</p>
    </div>
    <div className={retroPanelClassName({ tone: "accent", className: "p-4" })}>
      <p className="text-sm text-white">Accent Panel</p>
    </div>
    <div className={retroPanelClassName({ tone: "muted", className: "p-4" })}>
      <p className="text-sm text-white">Muted Panel</p>
    </div>
    <div className={retroPanelClassName({ tone: "flat", className: "p-4" })}>
      <p className="text-sm text-white">Flat Panel</p>
    </div>
  </div>
);

export const InsetStyle = () => (
  <div className="w-80">
    <div className={retroInsetClassName("p-4 rounded-[12px]")}>
      <p className="text-sm text-white/60">Inset / recessed surface</p>
    </div>
  </div>
);

export const StatTiles = () => (
  <div className="grid grid-cols-2 gap-3 w-80">
    <RetroStatTile label="Score" value="2,450" meta="42W 8L" />
    <RetroStatTile label="Ranking" value="#1" meta="/ 156" />
  </div>
);

export const EmptyState = () => (
  <div className="w-96">
    <RetroEmptyState
      title="No data"
      description="Start predicting to see your stats here."
      action={<button className={retroButtonClassName({ variant: "primary", size: "sm" })}>Start Predicting</button>}
    />
  </div>
);
