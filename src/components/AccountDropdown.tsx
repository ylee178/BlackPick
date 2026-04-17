"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { ChevronDown, User, Bell, RotateCw, LogOut, Trophy, Shield, Loader2 } from "lucide-react";
import {
  retroButtonClassName,
  retroPanelClassName,
} from "@/components/ui/retro";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";
import ConfirmModal from "@/components/ConfirmModal";

type Props = {
  ringName: string;
  score: number;
  wins: number;
  losses: number;
  isAdmin?: boolean;
};

export default function AccountDropdown({
  ringName,
  score,
  wins,
  losses,
  isAdmin = false,
}: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
    }
  }

  async function handleResetRecord() {
    setResetting(true);
    try {
      const res = await fetch("/api/profile/reset-record", { method: "POST" });
      if (!res.ok) {
        window.alert(t("account.resetRecordFailed"));
        return;
      }

      setResetModal(false);
      setOpen(false);
      router.refresh();
    } catch {
      window.alert(t("account.resetRecordFailed"));
    } finally {
      setResetting(false);
    }
  }

  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  return (
    <>
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
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bp-accent)] text-xs font-bold text-[var(--bp-bg)]">
            {ringName.charAt(0).toUpperCase()}
          </div>
          <span className="hidden text-sm font-medium text-[var(--bp-ink)] sm:inline">{ringName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--bp-muted)]" strokeWidth={2} />
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
              <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--bp-muted)]">
                <span className="text-[#4ade80]">{wins}W</span>-<span className="text-[#f87171]">{losses}L</span> · {winRate}% · <Trophy className="h-3 w-3 text-[var(--bp-accent)]" strokeWidth={2} /><span className="text-[var(--bp-ink)]">{score}</span>
              </p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--bp-muted)] transition-colors duration-150 hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]"
              >
                <User className="h-4 w-4" strokeWidth={1.8} />
                {t("account.editProfile")}
              </Link>
              <Link
                href="/profile/notifications"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--bp-muted)] transition-colors duration-150 hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]"
              >
                <Bell className="h-4 w-4" strokeWidth={1.8} />
                {t("account.notificationSettings")}
              </Link>
            </div>

            {isAdmin ? (
              <div className="border-t border-[var(--bp-line)] py-1">
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--bp-muted)] transition-colors duration-150 hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]"
                >
                  <Shield className="h-4 w-4" strokeWidth={1.8} />
                  {t("nav.admin")}
                </Link>
              </div>
            ) : null}

            {/* Reset record */}
            <div className="border-t border-[var(--bp-line)] py-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setResetModal(true);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--bp-muted)] transition-colors duration-150 hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]"
              >
                <RotateCw className="h-4 w-4" strokeWidth={1.8} />
                {t("account.resetRecord")}
              </button>
            </div>

            {/* Logout — red */}
            <div className="border-t border-[var(--bp-line)] pt-1">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-busy={loggingOut}
                className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--bp-danger)] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.08)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent enabled:cursor-pointer"
              >
                <LoadingButtonContent
                  loading={loggingOut}
                  loadingLabel={t("auth.loggingOut")}
                  icon={<LogOut className="h-4 w-4" strokeWidth={1.8} />}
                  className="justify-start gap-2.5"
                  spinnerClassName="text-[var(--bp-danger)]"
                >
                  {t("auth.logout")}
                </LoadingButtonContent>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {loggingOut ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-[var(--bp-bg)]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-8 w-8 animate-spin text-[var(--bp-accent)]" strokeWidth={2} />
          <span className="text-sm text-[var(--bp-muted)]">{t("auth.loggingOut")}</span>
        </div>
      ) : null}

      {/* Reset record confirmation modal */}
      <ConfirmModal
        open={resetModal}
        onClose={() => setResetModal(false)}
        onConfirm={handleResetRecord}
        title={t("account.resetRecord")}
        description={t("account.resetRecordConfirm")}
        confirmLabel={t("account.resetRecord")}
        cancelLabel={t("discussion.cancel")}
        danger
        loading={resetting}
      />
    </>
  );
}
