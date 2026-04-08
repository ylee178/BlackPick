"use client";

import { useCallback, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { getLocalizedEventName } from "@/lib/localized-name";
import { retroPanelClassName } from "@/components/ui/retro";
import { RankingRowCompact } from "@/components/ui/ranking";

type CompletedEvent = {
  id: string;
  name: string;
  date: string;
};

type RankUser = {
  id: string;
  ring_name: string | null;
  score: number | null;
  wins: number | null;
  losses: number | null;
};

type Props = {
  completedEvents: CompletedEvent[];
  initialEventIndex: number;
  initialUsers: RankUser[];
};

function ArrowLeft() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 3 5 8l5 5" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

const EVENT_DELTAS = [1, -1, 2, 0, -2];

export default function EventRankingCard({ completedEvents, initialEventIndex, initialUsers }: Props) {
  const { t, locale } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(initialEventIndex);
  const [users, setUsers] = useState<RankUser[]>(initialUsers);
  const [loading, setLoading] = useState(false);

  const currentEvent = completedEvents[currentIndex] ?? null;
  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < completedEvents.length - 1;

  const fetchRankings = useCallback(async (eventId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ranking?type=event&reference_id=${eventId}&limit=5`);
      if (res.ok) {
        const json = await res.json();
        const ranked = (json.data ?? []) as Array<{ user: RankUser | null; score: number | null }>;
        setUsers(
          ranked
            .filter((r) => r.user)
            .map((r) => ({ ...r.user!, score: r.score ?? r.user!.score }))
        );
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function goLeft() {
    if (!canGoLeft) return;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    const ev = completedEvents[newIndex];
    if (ev) void fetchRankings(ev.id);
  }

  function goRight() {
    if (!canGoRight) return;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    const ev = completedEvents[newIndex];
    if (ev) void fetchRankings(ev.id);
  }

  if (completedEvents.length === 0) {
    return (
      <section className={retroPanelClassName({ className: "p-4" })}>
        <p className="text-sm font-semibold text-[var(--bp-ink)]">{t("ranking.event")}</p>
        <p className="mt-3 py-4 text-center text-xs text-[var(--bp-muted)]">{t("common.noData")}</p>
      </section>
    );
  }

  return (
    <section className={retroPanelClassName({ className: "p-4" })}>
      {/* Header with arrows */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--bp-ink)]">{t("ranking.event")}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goLeft}
            disabled={!canGoLeft}
            aria-label="Previous event"
            className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors duration-150 ${
              canGoLeft
                ? "text-[var(--bp-muted)] hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]"
                : "pointer-events-none text-[var(--bp-muted)] opacity-20"
            }`}
          >
            <ArrowLeft />
          </button>
          <button
            type="button"
            onClick={goRight}
            disabled={!canGoRight}
            aria-label="Next event"
            className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors duration-150 ${
              canGoRight
                ? "text-[var(--bp-muted)] hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]"
                : "pointer-events-none text-[var(--bp-muted)] opacity-20"
            }`}
          >
            <ArrowRight />
          </button>
        </div>
      </div>

      {/* Current event name */}
      {currentEvent ? (
        <Link
          href={`/ranking?tab=event&event=${currentEvent.id}`}
          className="mt-1 block truncate text-xs text-[var(--bp-accent)] hover:underline"
        >
          {getLocalizedEventName(currentEvent, locale, currentEvent.name)}
        </Link>
      ) : null}

      {/* Rankings list */}
      <div className="mt-3 space-y-1">
        {loading ? (
          <div className="space-y-2 py-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[10px] bg-[var(--bp-card-inset)] px-3 py-2">
                <div className="h-4 w-5 animate-shimmer rounded bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,186,60,0.12)] to-[rgba(255,255,255,0.04)] bg-[length:200%_100%]" />
                <div className="h-4 w-24 animate-shimmer rounded bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,186,60,0.12)] to-[rgba(255,255,255,0.04)] bg-[length:200%_100%]" />
                <div className="ml-auto h-4 w-14 animate-shimmer rounded bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,186,60,0.12)] to-[rgba(255,255,255,0.04)] bg-[length:200%_100%]" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="py-4 text-center text-xs text-[var(--bp-muted)]">{t("common.noData")}</p>
        ) : (
          users.map((user, index) => (
            <RankingRowCompact
              key={user.id}
              rank={index + 1}
              delta={EVENT_DELTAS[index] ?? 0}
              name={user.ring_name}
              value={user.score ?? 0}
              unknownLabel={t("ranking.unknown")}
            />
          ))
        )}
      </div>
    </section>
  );
}
