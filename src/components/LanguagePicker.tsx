"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n, type Locale } from "@/lib/i18n-provider";
import { cn } from "@/lib/cn";
import {
  retroButtonClassName,
  retroInsetClassName,
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
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m6 9 6 6 6-6" />
    </svg>
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
        <circle cx="10" cy="10" r="10" fill="#fff" />
        <path d="M10 6a4 4 0 0 1 0 8 4 4 0 0 0 0-8Z" fill="#cd2e3a" />
        <path d="M10 14a4 4 0 0 1 0-8 4 4 0 0 0 0 8Z" fill="#0047a0" />
      </svg>
    );
  }

  if (code === "JP") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 rounded-full">
        <circle cx="10" cy="10" r="10" fill="#fff" />
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
          className: "h-10 px-3 text-sm",
        })}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Flag code={current.flag} />
        <span className="hidden text-xs font-medium sm:inline">{current.short}</span>
        <span className="text-[var(--retro-muted)]">
          <ChevronDown />
        </span>
      </button>

      {open ? (
        <div
          className={retroPanelClassName({
            tone: "muted",
            className: "absolute right-0 top-[calc(100%+10px)] z-50 min-w-[180px] p-1.5",
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
                  retroInsetClassName("flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm"),
                  active
                    ? "border-[var(--retro-line-strong)] text-[var(--retro-ink)]"
                    : "border-transparent text-[var(--retro-muted)] hover:border-[var(--retro-line)] hover:text-[var(--retro-ink)]"
                )}
                role="menuitem"
              >
                <Flag code={language.flag} />
                <span className="flex-1">{language.label}</span>
                <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--retro-muted)]">
                  {language.short}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
