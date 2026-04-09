"use client";

import type { Meta } from "@storybook/nextjs-vite";
import { withI18n } from "./decorators";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const meta: Meta = {
  title: "Components/NotificationBell",
  parameters: { layout: "centered" },
  decorators: [withI18n],
};
export default meta;

/*
 * NotificationBell fetches from /api/notifications, so we render static mocks
 * covering all visual states: no unread, with badge, and the expanded panel.
 */

const typeIcons: Record<string, string> = {
  fight_start: "\uD83E\uDD4A",
  result: "\uD83D\uDCCA",
  mvp_vote: "\uD83C\uDFC6",
  ranking_change: "\uD83D\uDCC8",
};

function BellButton({ unread }: { unread: number }) {
  return (
    <button
      type="button"
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--bp-line)] bg-[var(--bp-card)] text-[var(--bp-muted)] transition hover:border-[var(--bp-line-strong)] hover:text-[var(--bp-ink)]"
    >
      <Bell className="h-5 w-5" strokeWidth={2} />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--bp-danger)] px-1 text-xs font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </button>
  );
}

type MockNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  time: string;
};

const mockNotifications: MockNotification[] = [
  { id: "1", type: "fight_start", title: "Fight starting soon", body: "Kim vs Watanabe begins in 15 minutes", is_read: false, time: "2m" },
  { id: "2", type: "result", title: "Results are in", body: "Black Combat 12 results are now available", is_read: false, time: "1h" },
  { id: "3", type: "mvp_vote", title: "MVP voting is open", body: "Cast your vote for Black Combat 12 MVP", is_read: true, time: "3h" },
  { id: "4", type: "ranking_change", title: "Your ranking changed", body: "You moved up to #15 in the All-Time rankings", is_read: true, time: "1d" },
];

function MockPanel({ notifications, unread }: { notifications: MockNotification[]; unread: number }) {
  return (
    <div className="w-80 overflow-hidden rounded-[12px] border border-[var(--bp-line)] bg-[var(--bp-card)] shadow-lg">
      <div className="flex items-center justify-between border-b border-[var(--bp-line)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--bp-ink)]">Notifications</p>
        {unread > 0 ? (
          <button type="button" className="text-xs text-[var(--bp-accent)] hover:underline">
            Mark all read
          </button>
        ) : null}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--bp-muted)]">No notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex gap-3 border-b border-[var(--bp-line)] px-4 py-3 last:border-b-0",
                !n.is_read && "bg-[rgba(229,169,68,0.04)]",
              )}
            >
              <span className="mt-0.5 text-base">{typeIcons[n.type] ?? "\uD83D\uDD14"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-semibold text-[var(--bp-ink)]">{n.title}</p>
                  {!n.is_read ? (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--bp-accent)]" />
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{n.body}</p>
                <p className="mt-1 text-xs text-[var(--bp-muted)]">{n.time}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── No unread notifications ── */
export const NoUnread = () => (
  <div className="flex flex-col items-center gap-4">
    <p className="text-xs text-white/50">No unread</p>
    <BellButton unread={0} />
  </div>
);

/* ── With unread badge ── */
export const WithBadge = () => (
  <div className="flex flex-col items-center gap-6">
    <p className="text-xs text-white/50">Unread counts: 2, 9, 10+</p>
    <div className="flex items-center gap-6">
      <BellButton unread={2} />
      <BellButton unread={9} />
      <BellButton unread={14} />
    </div>
  </div>
);

/* ── Expanded panel with notifications ── */
export const PanelOpen = () => (
  <div className="flex flex-col items-end gap-4">
    <p className="text-xs text-white/50">Expanded notification panel</p>
    <div className="relative">
      <BellButton unread={2} />
      <div className="absolute right-0 top-11 z-50">
        <MockPanel notifications={mockNotifications} unread={2} />
      </div>
    </div>
  </div>
);

/* ── Empty panel ── */
export const PanelEmpty = () => (
  <div className="flex flex-col items-end gap-4">
    <p className="text-xs text-white/50">Empty notification panel</p>
    <MockPanel notifications={[]} unread={0} />
  </div>
);
