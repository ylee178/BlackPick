"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { getSeriesLabel } from "@/lib/constants";
import { retroPanelClassName } from "@/components/ui/retro";
import { RankingRowCompact } from "@/components/ui/ranking";

type RankUser = {
  id: string;
  ring_name: string | null;
  score: number | null;
};

type Props = {
  seriesTypes: string[];
  initialSeriesType: string;
  initialUsers: RankUser[];
};

export default function LeagueRankingCard({ seriesTypes, initialSeriesType, initialUsers }: Props) {
  const { t } = useI18n();
  const [currentSeries, setCurrentSeries] = useState(initialSeriesType);
  const [users, setUsers] = useState<RankUser[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(initialUsers.length > 0);

  const fetchRankings = useCallback(async (seriesType: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ranking?type=series&series_type=${seriesType}&limit=5`);
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

  // Auto-fetch on mount if no initial data
  useEffect(() => {
    if (!initialized && currentSeries) {
      void fetchRankings(currentSeries);
      setInitialized(true);
    }
  }, [initialized, currentSeries, fetchRankings]);

  function handleSelect(seriesType: string) {
    setCurrentSeries(seriesType);
    void fetchRankings(seriesType);
  }

  // Filter to supported leagues only
  const filteredTypes = seriesTypes.filter((st) => st === "black_cup" || st === "numbering");

  if (filteredTypes.length === 0) {
    return (
      <section className={retroPanelClassName({ className: "p-4" })}>
        <p className="text-sm font-semibold text-[var(--bp-ink)]">{t("ranking.series")}</p>
        <p className="mt-3 py-4 text-center text-xs text-[var(--bp-muted)]">{t("common.noData")}</p>
      </section>
    );
  }

  return (
    <section className={retroPanelClassName({ className: "p-4" })}>
      <p className="text-sm font-semibold text-[var(--bp-ink)]">{t("ranking.series")}</p>

      {/* League tabs */}
      <div className="mt-2 flex gap-1.5">
        {filteredTypes.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => handleSelect(st)}
            className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
              currentSeries === st
                ? "bg-[var(--bp-accent-dim)] text-[var(--bp-accent)]"
                : "text-[var(--bp-muted)] hover:text-[var(--bp-ink)]"
            }`}
          >
            {getSeriesLabel(st, t)}
          </button>
        ))}
      </div>

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
