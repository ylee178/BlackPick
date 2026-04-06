"use client";

import type { Meta } from "@storybook/nextjs-vite";
import { withI18n } from "./decorators";
import {
  retroButtonClassName,
  retroPanelClassName,
} from "@/components/ui/retro";
import { ChevronDown, User, Bell, RotateCw, Trash2, LogOut } from "lucide-react";

const meta: Meta = {
  title: "Components/AccountDropdown",
  parameters: { layout: "centered" },
  decorators: [withI18n],
};
export default meta;

/*
 * AccountDropdown relies on Supabase auth + Next.js router for logout/delete.
 * We render static mocks of the trigger button and the open dropdown panel.
 */

function MockTriggerButton({ ringName }: { ringName: string }) {
  return (
    <button
      type="button"
      className={retroButtonClassName({ variant: "ghost", size: "sm", className: "gap-1.5" })}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bp-accent)] text-xs font-bold text-[var(--bp-bg)]">
        {ringName.charAt(0).toUpperCase()}
      </div>
      <span className="text-sm font-medium text-[var(--bp-ink)]">{ringName}</span>
      <ChevronDown className="h-3.5 w-3.5 text-[var(--bp-muted)]" strokeWidth={2} />
    </button>
  );
}

function MockDropdownPanel({ ringName, wins, losses, score }: { ringName: string; wins: number; losses: number; score: number }) {
  const menuItem = "flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--bp-muted)] transition-colors duration-150 hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]";
  const dangerItem = "flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--bp-danger)] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.08)]";

  return (
    <div className={retroPanelClassName({ className: "w-56 p-1" })}>
      <div className="border-b border-[var(--bp-line)] px-3 py-2.5">
        <p className="text-sm font-semibold text-[var(--bp-ink)]">{ringName}</p>
        <p className="mt-0.5 text-xs text-[var(--bp-muted)]">
          {wins}W-{losses}L · {score}pts
        </p>
      </div>
      <div className="py-1">
        <button type="button" className={menuItem}>
          <User className="h-4 w-4" strokeWidth={1.8} /> Edit Profile
        </button>
        <button type="button" className={menuItem}>
          <Bell className="h-4 w-4" strokeWidth={1.8} /> Notification Settings
        </button>
      </div>
      <div className="border-t border-[var(--bp-line)] py-1">
        <button type="button" className={menuItem}>
          <RotateCw className="h-4 w-4" strokeWidth={1.8} /> Reset Record
        </button>
        <button type="button" className={dangerItem}>
          <Trash2 className="h-4 w-4" strokeWidth={1.8} /> Delete Account
        </button>
      </div>
      <div className="border-t border-[var(--bp-line)] pt-1">
        <button type="button" className={menuItem}>
          <LogOut className="h-4 w-4" strokeWidth={1.8} /> Log out
        </button>
      </div>
    </div>
  );
}

/* ── Closed state (trigger button only) ── */
export const Closed = () => (
  <div className="flex flex-col items-end gap-4">
    <p className="text-xs text-white/50">Trigger button (collapsed)</p>
    <MockTriggerButton ringName="SteelFist" />
  </div>
);

/* ── Open state (dropdown visible) ── */
export const Open = () => (
  <div className="flex flex-col items-end gap-4">
    <p className="text-xs text-white/50">Dropdown expanded</p>
    <div className="relative">
      <MockTriggerButton ringName="SteelFist" />
      <div className="absolute right-0 top-[calc(100%+6px)] z-50">
        <MockDropdownPanel ringName="SteelFist" wins={42} losses={8} score={2450} />
      </div>
    </div>
  </div>
);

/* ── Long ring name ── */
export const LongName = () => (
  <div className="flex flex-col items-end gap-4">
    <p className="text-xs text-white/50">Long ring name</p>
    <div className="relative">
      <MockTriggerButton ringName="TheUndisputedChampion" />
      <div className="absolute right-0 top-[calc(100%+6px)] z-50">
        <MockDropdownPanel ringName="TheUndisputedChampion" wins={100} losses={0} score={9999} />
      </div>
    </div>
  </div>
);
