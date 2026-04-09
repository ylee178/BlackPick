import {
  Crown,
  Crosshair,
  Target,
  Sparkles,
  Flame,
  Trophy,
  Globe,
  Sword,
  Medal,
} from "lucide-react";
import type { ComponentType } from "react";

export type BadgeType =
  | "oracle"
  | "sniper"
  | "sharp_call"
  | "perfect_card"
  | "streak_fire"
  | "century"
  | "world_class"
  | "first_blood"
  | "champion";

export type EarnedBadge = {
  type: BadgeType;
  count: number;
};

export const BADGE_CONFIG: Record<
  BadgeType,
  {
    label: string;
    icon: ComponentType<{ className?: string }>;
    color: string; // tailwind classes for border + bg + text
    mvp: boolean;
  }
> = {
  oracle: {
    label: "Oracle",
    icon: Crown,
    color: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300",
    mvp: true,
  },
  sniper: {
    label: "Sniper",
    icon: Crosshair,
    color: "border-blue-500/40 bg-blue-500/15 text-blue-300",
    mvp: true,
  },
  sharp_call: {
    label: "Sharp Call",
    icon: Target,
    color: "border-green-500/40 bg-green-500/15 text-green-300",
    mvp: true,
  },
  perfect_card: {
    label: "Perfect Card",
    icon: Sparkles,
    color: "border-purple-500/40 bg-purple-500/15 text-purple-300",
    mvp: true,
  },
  streak_fire: {
    label: "Streak Fire",
    icon: Flame,
    color: "border-orange-500/40 bg-orange-500/15 text-orange-300",
    mvp: false,
  },
  century: {
    label: "Century",
    icon: Trophy,
    color: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    mvp: false,
  },
  world_class: {
    label: "World Class",
    icon: Globe,
    color: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    mvp: false,
  },
  first_blood: {
    label: "First Blood",
    icon: Sword,
    color: "border-red-500/40 bg-red-500/15 text-red-300",
    mvp: false,
  },
  champion: {
    label: "Champion",
    icon: Medal,
    color: "border-yellow-400/40 bg-yellow-400/15 text-yellow-200",
    mvp: false,
  },
};
