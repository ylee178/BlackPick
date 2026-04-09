"use client";

import { useRef, useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { locales, localeDisplayNames, localeFlags, type Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import { retroPanelClassName } from "@/components/ui/retro";

export default function LanguagePicker() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // First visit pulse hint
  useEffect(() => {
    const key = "bp_lang_seen";
    if (!localStorage.getItem(key)) {
      setShowHint(true);
      localStorage.setItem(key, "1");
      const timer = setTimeout(() => setShowHint(false), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[var(--bp-line)] px-2.5 text-sm text-[var(--bp-ink)] transition hover:border-[rgba(255,255,255,0.15)] hover:bg-[var(--bp-card-inset)]",
          showHint && "animate-pulse",
        )}
        aria-label="Change language"
        aria-expanded={open}
      >
        <span className="text-base">{localeFlags[locale]}</span>
        <span className="hidden text-sm sm:inline">{localeDisplayNames[locale]}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      </button>

      {open && (
        <div
          className={retroPanelClassName({
            className: "absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden p-1",
          })}
          role="listbox"
          aria-label="Language selection"
        >
          {locales.map((l) => (
            <button
              key={l}
              role="option"
              aria-selected={l === locale}
              onClick={() => {
                // Persist to DB before navigation (fire-and-forget via sendBeacon)
                if (typeof navigator.sendBeacon === "function") {
                  navigator.sendBeacon(
                    "/api/profile/language",
                    new Blob([JSON.stringify({ language: l })], { type: "application/json" }),
                  );
                }
                setLocale(l);
                setOpen(false);
              }}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm transition",
                l === locale
                  ? "bg-[var(--bp-accent-dim)] font-semibold text-[var(--bp-ink)]"
                  : "text-[var(--bp-muted)] hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]",
              )}
            >
              <span className="flex items-center gap-2">
                <span>{localeFlags[l]}</span>
                {localeDisplayNames[l]}
              </span>
              {l === locale && <Check className="h-3.5 w-3.5 text-[var(--bp-accent)]" strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
