"use client";

import { useSyncExternalStore } from "react";

/**
 * Module-level notification store backed by `useSyncExternalStore`.
 *
 * We moved polling out of `useEffect` because
 * `react-hooks/set-state-in-effect` flags any synchronous setState inside
 * an effect body — and the old `NotificationBell` pattern called a
 * `fetchNotifications()` useCallback that synchronously kicked off a fetch
 * whose `.then` eventually hit setState. The lint rule counted that as a
 * violation.
 *
 * The new model: a single shared poller owned by this module, started on
 * the first subscription, stopped on the last unsubscribe. Components
 * subscribe via `useNotificationsStore()` and write via
 * `markAllNotificationsRead()` — no effect-body setState anywhere.
 */

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationsSnapshot = {
  notifications: readonly Notification[];
  unreadCount: number;
};

const EMPTY_SNAPSHOT: NotificationsSnapshot = Object.freeze({
  notifications: Object.freeze([]) as readonly Notification[],
  unreadCount: 0,
});

const POLL_INTERVAL_MS = 60_000;

let snapshot: NotificationsSnapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let inflight: Promise<void> | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * @internal — exported for unit tests. Structural equality check used by
 * the polling path to skip no-change emit cycles.
 */
export function snapshotsEqual(
  a: NotificationsSnapshot,
  b: NotificationsSnapshot,
): boolean {
  if (a.unreadCount !== b.unreadCount) return false;
  if (a.notifications.length !== b.notifications.length) return false;
  for (let i = 0; i < a.notifications.length; i++) {
    const prev = a.notifications[i];
    const next = b.notifications[i];
    // id + is_read are the only fields the bell actually reads. Matching on
    // both covers the read-state flip flow. Created_at/title/body are
    // effectively immutable for an already-emitted notification, so
    // ignoring them here is safe and keeps the check cheap.
    if (prev.id !== next.id || prev.is_read !== next.is_read) return false;
  }
  return true;
}

async function fetchOnce(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      const data = await res.json();
      if (res.ok) {
        const next: NotificationsSnapshot = {
          notifications: (data.notifications ?? []) as Notification[],
          unreadCount: data.unread_count ?? 0,
        };
        // Skip the assign + emit when the new payload is structurally
        // equal to the current snapshot. Subscribers would otherwise
        // re-render every 60s on idle pages even though nothing changed.
        if (snapshotsEqual(snapshot, next)) return;
        snapshot = next;
        emit();
      }
    } catch {
      // silently fail — the bell just keeps its last snapshot
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    // Fire-and-forget initial fetch. It's async so no setState runs
    // synchronously from `subscribe` — React's useSyncExternalStore is
    // happy.
    void fetchOnce();
    pollTimer = setInterval(() => {
      void fetchOnce();
    }, POLL_INTERVAL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}

function getSnapshot(): NotificationsSnapshot {
  return snapshot;
}

function getServerSnapshot(): NotificationsSnapshot {
  return EMPTY_SNAPSHOT;
}

export function useNotificationsStore(): NotificationsSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Mark every notification as read. Matches the pre-refactor behavior:
 * await the PATCH first, then commit the store update. We don't show
 * "all read" until the server confirms, which keeps the UI honest if
 * the request fails.
 */
export async function markAllNotificationsRead(): Promise<void> {
  try {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (!res.ok) return;
    snapshot = {
      notifications: snapshot.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    };
    emit();
  } catch {
    // silently fail
  }
}
