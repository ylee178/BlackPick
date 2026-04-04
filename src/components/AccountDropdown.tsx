"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  retroButtonClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

type Props = {
  ringName: string;
  score: number;
  wins: number;
  losses: number;
};

export default function AccountDropdown({ ringName, score, wins, losses }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    setOpen(false);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={retroButtonClassName({
          variant: "ghost",
          size: "sm",
          className: "gap-1.5",
        })}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bp-accent)] text-[10px] font-bold text-[var(--bp-bg)]">
          {ringName.charAt(0).toUpperCase()}
        </div>
        <span className="hidden text-sm font-medium text-[var(--bp-ink)] sm:inline">{ringName}</span>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--bp-muted)]" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          className={retroPanelClassName({
            className: "absolute right-0 top-[calc(100%+6px)] z-50 w-56 p-1",
          })}
        >
          {/* User info */}
          <div className="border-b border-[var(--bp-line)] px-3 py-2.5">
            <p className="text-sm font-semibold text-[var(--bp-ink)]">{ringName}</p>
            <p className="mt-0.5 text-[11px] text-[var(--bp-muted)]">
              {wins}W-{losses}L · {score}pts
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--bp-muted)] transition-colors duration-150 hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Z" />
                <path d="M4 20a8 8 0 0 1 16 0" />
              </svg>
              {t("nav.profile")}
            </Link>
            <Link
              href="/events"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--bp-muted)] transition-colors duration-150 hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 2.75v3.5M17 2.75v3.5M3 8.25h18" />
                <rect x="3" y="4.75" width="18" height="16.5" rx="2.5" />
              </svg>
              {t("nav.events")}
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-[var(--bp-line)] pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--bp-danger)] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.08)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
