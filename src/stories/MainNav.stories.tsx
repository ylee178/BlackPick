"use client";

import type { Meta } from "@storybook/nextjs-vite";
import { withI18n } from "./decorators";
import { retroNavLinkClassName } from "@/components/ui/retro";
import { Home, CalendarDays, Trophy } from "lucide-react";

const meta: Meta = {
  title: "Components/MainNav",
  parameters: { layout: "centered" },
  decorators: [withI18n],
};
export default meta;

/*
 * MainNav uses usePathname() which is hard to mock reliably in Storybook.
 * We render static replicas showing each active state.
 */

const desktopLinks = [
  { label: "Predict", active: false },
  { label: "My Record", active: false },
  { label: "Ranking", active: false },
];

const mobileLinks = [
  { label: "Predict", icon: <Home className="h-5 w-5" strokeWidth={1.8} />, active: false },
  { label: "My Record", icon: <CalendarDays className="h-5 w-5" strokeWidth={1.8} />, active: false },
  { label: "Ranking", icon: <Trophy className="h-5 w-5" strokeWidth={1.8} />, active: false },
];

/* ── Desktop nav — each tab active ── */
export const DesktopPicksActive = () => (
  <div className="flex flex-col gap-4">
    <p className="text-xs text-white/50">Desktop — Predict active</p>
    <nav className="flex items-center gap-1">
      {desktopLinks.map((link, i) => (
        <span key={link.label} className={retroNavLinkClassName({ active: i === 0 })}>
          {link.label}
        </span>
      ))}
    </nav>
  </div>
);

export const DesktopMyRecordActive = () => (
  <div className="flex flex-col gap-4">
    <p className="text-xs text-white/50">Desktop — My Record active</p>
    <nav className="flex items-center gap-1">
      {desktopLinks.map((link, i) => (
        <span key={link.label} className={retroNavLinkClassName({ active: i === 1 })}>
          {link.label}
        </span>
      ))}
    </nav>
  </div>
);

export const DesktopRankingActive = () => (
  <div className="flex flex-col gap-4">
    <p className="text-xs text-white/50">Desktop — Ranking active</p>
    <nav className="flex items-center gap-1">
      {desktopLinks.map((link, i) => (
        <span key={link.label} className={retroNavLinkClassName({ active: i === 2 })}>
          {link.label}
        </span>
      ))}
    </nav>
  </div>
);

/* ── Mobile bottom nav ── */
export const MobilePicksActive = () => (
  <div className="flex flex-col gap-4">
    <p className="text-xs text-white/50">Mobile bottom nav — Predict active</p>
    <nav className="grid w-[375px] grid-cols-3 border-t border-[var(--bp-line)] bg-[var(--bp-bg)]">
      {mobileLinks.map((link, i) => {
        const active = i === 0;
        return (
          <span key={link.label} className={retroNavLinkClassName({ active, mobile: true })}>
            <span className={active ? "text-[var(--bp-accent)]" : "text-[var(--bp-muted)]"}>
              {link.icon}
            </span>
            <span className={active ? "text-[var(--bp-accent)]" : "text-[var(--bp-muted)]"}>
              {link.label}
            </span>
          </span>
        );
      })}
    </nav>
  </div>
);

export const MobileRankingActive = () => (
  <div className="flex flex-col gap-4">
    <p className="text-xs text-white/50">Mobile bottom nav — Ranking active</p>
    <nav className="grid w-[375px] grid-cols-3 border-t border-[var(--bp-line)] bg-[var(--bp-bg)]">
      {mobileLinks.map((link, i) => {
        const active = i === 2;
        return (
          <span key={link.label} className={retroNavLinkClassName({ active, mobile: true })}>
            <span className={active ? "text-[var(--bp-accent)]" : "text-[var(--bp-muted)]"}>
              {link.icon}
            </span>
            <span className={active ? "text-[var(--bp-accent)]" : "text-[var(--bp-muted)]"}>
              {link.label}
            </span>
          </span>
        );
      })}
    </nav>
  </div>
);
