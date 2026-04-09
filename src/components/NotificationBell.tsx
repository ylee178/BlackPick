"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
};

function BellIcon({ className }: { className?: string }) {
  return <Bell className={cn("h-5 w-5", className)} strokeWidth={2} />;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const typeIcons: Record<string, string> = {
  fight_start: "🥊",
  result: "📊",
  mvp_vote: "🏆",
  ranking_change: "📈",
};

export default function NotificationBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unread_count ?? 0);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // silently fail
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--bp-line)] text-[var(--bp-muted)] transition hover:border-[rgba(255,255,255,0.15)] hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]"
        aria-label={unreadCount > 0 ? `${t("notification.title")} (${unreadCount})` : t("notification.title")}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--bp-danger)] px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div role="dialog" aria-label={t("notification.title")} className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-[12px] border border-[var(--bp-line)] bg-[var(--bp-card)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--bp-line)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--bp-ink)]">{t("notification.title")}</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-[var(--bp-accent)] hover:underline"
              >
                {t("notification.markAllRead")}
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--bp-muted)]">{t("notification.empty")}</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 border-b border-[var(--bp-line)] px-4 py-3 last:border-b-0",
                    !n.is_read && "bg-[rgba(229,169,68,0.04)]",
                  )}
                >
                  <span className="mt-0.5 text-base">{typeIcons[n.type] ?? "🔔"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-[var(--bp-ink)]">{n.title}</p>
                      {!n.is_read ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--bp-accent)]" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{n.body}</p>
                    <p className="mt-1 text-xs text-[var(--bp-muted)]">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
