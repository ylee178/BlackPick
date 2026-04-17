"use client";

import type { Meta } from "@storybook/nextjs-vite";
import LanguagePicker from "@/components/LanguagePicker";
import { withI18n } from "./decorators";
import {
  retroButtonClassName,
  retroPanelClassName,
} from "@/components/ui/retro";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const meta: Meta = {
  title: "Components/LanguagePicker",
  parameters: { layout: "centered" },
  decorators: [withI18n],
};
export default meta;

/* ── Live component (trigger button, interactive) ── */
export const Interactive = () => (
  <div className="flex flex-col items-end gap-4">
    <p className="text-xs text-white/50">Live LanguagePicker component — click to open</p>
    <LanguagePicker />
  </div>
);

/*
 * Static mock of the open dropdown state for visual review,
 * since screenshots cannot capture the interactive open state.
 */

/* Inline SVG flags (same as the component) */
function FlagUS() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 rounded-full">
      <defs><clipPath id="sb-us"><circle cx="10" cy="10" r="10" /></clipPath></defs>
      <g clipPath="url(#sb-us)">
        <rect width="20" height="20" fill="#b22234" />
        <rect y="2" width="20" height="2" fill="#fff" />
        <rect y="6" width="20" height="2" fill="#fff" />
        <rect y="10" width="20" height="2" fill="#fff" />
        <rect y="14" width="20" height="2" fill="#fff" />
        <rect y="18" width="20" height="2" fill="#fff" />
        <rect width="9" height="8.5" fill="#3c3b6e" />
      </g>
    </svg>
  );
}
function FlagKR() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 rounded-full">
      <circle cx="10" cy="10" r="9" fill="#fff" stroke="rgba(18,22,27,0.22)" strokeWidth="1" />
      <g transform="rotate(-33 10 10)">
        <path d="M10 6.2a3.8 3.8 0 1 1 0 7.6 1.9 1.9 0 0 0 0-3.8 1.9 1.9 0 0 1 0-3.8Z" fill="#cd2e3a" />
        <path d="M10 13.8a3.8 3.8 0 1 1 0-7.6 1.9 1.9 0 0 0 0 3.8 1.9 1.9 0 0 1 0 3.8Z" fill="#0047a0" />
      </g>
    </svg>
  );
}
function FlagJP() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 rounded-full">
      <circle cx="10" cy="10" r="9" fill="#fff" stroke="rgba(18,22,27,0.22)" strokeWidth="1" />
      <circle cx="10" cy="10" r="4" fill="#bc002d" />
    </svg>
  );
}
function FlagBR() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 rounded-full">
      <circle cx="10" cy="10" r="10" fill="#009b3a" />
      <path d="M10 3.5 16.5 10 10 16.5 3.5 10 10 3.5Z" fill="#ffdf00" />
      <circle cx="10" cy="10" r="3.2" fill="#002776" />
    </svg>
  );
}
function FlagES() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 rounded-full">
      <defs><clipPath id="sb-es"><circle cx="10" cy="10" r="10" /></clipPath></defs>
      <g clipPath="url(#sb-es)">
        <rect width="20" height="5" fill="#aa151b" />
        <rect y="5" width="20" height="10" fill="#f1bf00" />
        <rect y="15" width="20" height="5" fill="#aa151b" />
      </g>
    </svg>
  );
}
function FlagCN() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 rounded-full">
      <defs><clipPath id="sb-cn"><circle cx="10" cy="10" r="10" /></clipPath></defs>
      <g clipPath="url(#sb-cn)">
        <rect width="20" height="20" fill="#ee1c25" />
        <path
          d="M5 4.5 5.8 6.8 8.2 6.8 6.2 8.2 7 10.6 5 9.1 3 10.6 3.8 8.2 1.8 6.8 4.2 6.8Z"
          fill="#ffff00"
          transform="scale(0.5) translate(2 2)"
        />
      </g>
    </svg>
  );
}
function FlagMN() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 rounded-full">
      <defs><clipPath id="sb-mn"><circle cx="10" cy="10" r="10" /></clipPath></defs>
      <g clipPath="url(#sb-mn)">
        <rect width="6.67" height="20" fill="#c4272f" />
        <rect x="6.67" width="6.67" height="20" fill="#015cab" />
        <rect x="13.34" width="6.67" height="20" fill="#c4272f" />
      </g>
    </svg>
  );
}

const languages = [
  { flag: <FlagUS />, label: "English", short: "EN", active: true },
  { flag: <FlagKR />, label: "\uD55C\uAD6D\uC5B4", short: "KO", active: false },
  { flag: <FlagJP />, label: "\u65E5\u672C\u8A9E", short: "JA", active: false },
  { flag: <FlagES />, label: "Espa\u00F1ol", short: "ES", active: false },
  { flag: <FlagBR />, label: "Portugu\u00EAs", short: "PT", active: false },
  { flag: <FlagCN />, label: "\u7B80\u4F53\u4E2D\u6587", short: "ZH", active: false },
  { flag: <FlagMN />, label: "\u041C\u043E\u043D\u0433\u043E\u043B", short: "MN", active: false },
];

export const OpenDropdown = () => (
  <div className="flex flex-col items-end gap-4">
    <p className="text-xs text-white/50">Static mock — dropdown open, English selected</p>
    <div className="relative">
      <button
        type="button"
        className={retroButtonClassName({ variant: "ghost", size: "sm", className: "h-9 gap-1.5 px-2.5" })}
      >
        <FlagUS />
        <span className="text-xs">EN</span>
        <span className="text-[var(--bp-muted)]">
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </button>
      <div className={retroPanelClassName({ className: "absolute right-0 top-[calc(100%+6px)] z-50 min-w-[160px] p-1" })}>
        {languages.map((lang) => (
          <button
            key={lang.short}
            type="button"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-sm transition-colors duration-150",
              lang.active
                ? "bg-[var(--bp-accent-dim)] text-[var(--bp-ink)]"
                : "text-[var(--bp-muted)] hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]"
            )}
          >
            {lang.flag}
            <span className="flex-1">{lang.label}</span>
            <span className="text-xs text-[var(--bp-muted)]">{lang.short}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);
