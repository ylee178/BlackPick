"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n, type Locale } from "@/lib/i18n-provider";
import { cn } from "@/lib/cn";
import {
  retroButtonClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

const LANGUAGES: {
  code: Locale;
  label: string;
  short: string;
  flag: string;
}[] = [
  { code: "en", label: "English", short: "EN", flag: "US" },
  { code: "ko", label: "한국어", short: "KO", flag: "KR" },
  { code: "ja", label: "日本語", short: "JA", flag: "JP" },
  { code: "pt-BR", label: "Português", short: "PT", flag: "BR" },
];

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Trigram({
  x,
  y,
  rotation,
  pattern,
}: {
  x: number;
  y: number;
  rotation: number;
  pattern: Array<"solid" | "split">;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotation})`}
      stroke="#12161b"
      strokeWidth="0.85"
      strokeLinecap="round"
    >
      {pattern.map((line, index) => {
        const yOffset = index * 1.5 - 1.5;

        if (line === "solid") {
          return <line key={`${rotation}-${index}`} x1="-2" y1={yOffset} x2="2" y2={yOffset} />;
        }

        return (
          <g key={`${rotation}-${index}`}>
            <line x1="-2" y1={yOffset} x2="-0.55" y2={yOffset} />
            <line x1="0.55" y1={yOffset} x2="2" y2={yOffset} />
          </g>
        );
      })}
    </g>
  );
}

function Flag({ code }: { code: string }) {
  if (code === "US") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 rounded-full">
        <defs>
          <clipPath id="us-clip">
            <circle cx="10" cy="10" r="10" />
          </clipPath>
        </defs>
        <g clipPath="url(#us-clip)">
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

  if (code === "KR") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 rounded-full">
        <circle cx="10" cy="10" r="9" fill="#fff" stroke="rgba(18,22,27,0.22)" strokeWidth="1" />
        <g transform="rotate(-33 10 10)">
          <path d="M10 6.2a3.8 3.8 0 1 1 0 7.6 1.9 1.9 0 0 0 0-3.8 1.9 1.9 0 0 1 0-3.8Z" fill="#cd2e3a" />
          <path d="M10 13.8a3.8 3.8 0 1 1 0-7.6 1.9 1.9 0 0 0 0 3.8 1.9 1.9 0 0 1 0 3.8Z" fill="#0047a0" />
        </g>
        <Trigram x={5.1} y={5.5} rotation={-33} pattern={["solid", "solid", "solid"]} />
        <Trigram x={14.9} y={5.5} rotation={33} pattern={["solid", "split", "solid"]} />
        <Trigram x={5.1} y={14.5} rotation={33} pattern={["split", "solid", "split"]} />
        <Trigram x={14.9} y={14.5} rotation={-33} pattern={["split", "split", "split"]} />
      </svg>
    );
  }

  if (code === "JP") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 rounded-full">
        <circle cx="10" cy="10" r="9" fill="#fff" stroke="rgba(18,22,27,0.22)" strokeWidth="1" />
        <circle cx="10" cy="10" r="4" fill="#bc002d" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 rounded-full">
      <circle cx="10" cy="10" r="10" fill="#009b3a" />
      <path d="M10 3.5 16.5 10 10 16.5 3.5 10 10 3.5Z" fill="#ffdf00" />
      <circle cx="10" cy="10" r="3.2" fill="#002776" />
    </svg>
  );
}

export default function LanguagePicker() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((item) => item.code === locale) ?? LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={retroButtonClassName({
          variant: "ghost",
          size: "sm",
          className: "h-9 gap-1.5 px-2.5",
        })}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Flag code={current.flag} />
        <span className="hidden text-xs sm:inline">{current.short}</span>
        <span className="text-[var(--bp-muted)]">
          <ChevronDown />
        </span>
      </button>

      {open ? (
        <div
          className={retroPanelClassName({
            className: "absolute right-0 top-[calc(100%+6px)] z-50 min-w-[160px] p-1",
          })}
        >
          {LANGUAGES.map((language) => {
            const active = language.code === locale;

            return (
              <button
                key={language.code}
                type="button"
                onClick={() => {
                  setLocale(language.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-sm transition",
                  active
                    ? "bg-[var(--bp-accent-dim)] text-[var(--bp-ink)]"
                    : "text-[var(--bp-muted)] hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]"
                )}
                role="menuitem"
              >
                <Flag code={language.flag} />
                <span className="flex-1">{language.label}</span>
                <span className="text-[11px] text-[var(--bp-muted)]">{language.short}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
