"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import { getMvpVotingDeadline } from "@/lib/mvp-vote-window";
import FighterAvatar from "@/components/FighterAvatar";
import { useI18n } from "@/lib/i18n-provider";
import { getLocalizedFighterName } from "@/lib/localized-name";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";
import { cn } from "@/lib/utils";
import {
  RetroStatusBadge,
  retroButtonClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

type Fighter = {
  id: string;
  name: string;
  ring_name?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
  image_url?: string | null;
};

type Result = {
  fighter_id: string;
  name: string;
  ring_name?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
  image_url: string | null;
  votes: number;
  percentage: number;
};

type Props = {
  eventId: string;
  eventDate: string;
  eventCompletedAt: string | null;
  fighters: Fighter[];
};

export default function MvpVoteSection({
  eventId,
  eventDate,
  eventCompletedAt,
  fighters,
}: Props) {
  const { locale, t } = useI18n();
  const [selectedFighterId, setSelectedFighterId] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const votingDeadlineMs = useMemo(() => {
    try {
      return getMvpVotingDeadline(eventDate, eventCompletedAt).getTime();
    } catch {
      return null;
    }
  }, [eventCompletedAt, eventDate]);

  useEffect(() => {
    if (votingDeadlineMs === null) return;

    const remainingMs = votingDeadlineMs - Date.now();
    if (remainingMs <= 0) {
      setNow(Date.now());
      return;
    }

    const timer = window.setTimeout(() => {
      setNow(Date.now());
    }, remainingMs + 50);

    return () => window.clearTimeout(timer);
  }, [votingDeadlineMs]);

  const votingOpen = votingDeadlineMs !== null && now <= votingDeadlineMs;

  const loadResults = useCallback(async () => {
    try {
      const response = await fetch(`/api/mvp-vote?event_id=${eventId}`);
      const data = await response.json();
      if (response.ok) {
        setResults(data.results ?? []);
        setTotalVotes(data.total_votes ?? 0);
      }
    } catch {}
  }, [eventId]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  async function handleVote() {
    if (!selectedFighterId) {
      setMessage(t("mvp.selectFighter"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/mvp-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, fighter_id: selectedFighterId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || t("mvp.submitFailed"));
        return;
      }

      setMessage(t("mvp.submitted"));
      await loadResults();
    } catch {
      setMessage(t("mvp.unknownError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={retroPanelClassName({ className: "p-4" })}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--bp-ink)]">{t("event.mvpVote")}</p>
        <RetroStatusBadge tone="info">{totalVotes} {t("mvp.totalVotes")}</RetroStatusBadge>
      </div>
      <p className="mt-1 text-xs text-[var(--bp-muted)]">{t("mvp.oneVotePerEvent")}</p>

      {votingOpen ? (
        <>
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {fighters.map((fighter) => {
              const active = selectedFighterId === fighter.id;
              const fighterLabel = getLocalizedFighterName(fighter, locale, fighter.name);
              const avatarUrl = getFighterAvatarUrl(fighter);
              return (
                <button
                  key={fighter.id}
                  type="button"
                  onClick={() => setSelectedFighterId(fighter.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[10px] border p-2.5 text-left transition",
                    active
                      ? "border-[rgba(229,169,68,0.3)] bg-[var(--bp-accent-dim)]"
                      : "border-[var(--bp-line)] bg-[var(--bp-card-inset)] hover:border-[var(--bp-line-strong)]"
                  )}
                >
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-[8px] border border-[var(--bp-line)] bg-[var(--bp-card)]">
                    {avatarUrl ? (
                      <FighterAvatar src={avatarUrl} alt={fighterLabel} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--bp-muted)]">IMG</div>
                    )}
                  </div>
                  <p className="min-w-0 truncate text-sm font-medium text-[var(--bp-ink)]">{fighterLabel}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={handleVote}
              disabled={loading}
              aria-busy={loading}
              className={retroButtonClassName({ variant: "primary", size: "sm" })}
            >
              <LoadingButtonContent loading={loading} loadingLabel={t("mvp.submitting")}>
                {t("mvp.vote")}
              </LoadingButtonContent>
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-[var(--bp-muted)]">{t("mvp.ended")}</p>
      )}

      {message && <p className="mt-2 text-xs text-[var(--bp-muted)]">{message}</p>}

      {results.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-[var(--bp-muted)]">{t("mvp.results")}</p>
          {results.map((result) => {
            const avatarUrl = getFighterAvatarUrl(result);
            return (
              <div key={result.fighter_id} className="flex items-center gap-2.5 rounded-[10px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] p-2.5">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-[8px] border border-[var(--bp-line)] bg-[var(--bp-card)]">
                  {avatarUrl ? (
                    <FighterAvatar src={avatarUrl} alt={getLocalizedFighterName(result, locale, result.name)} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[var(--bp-muted)]">IMG</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-[var(--bp-ink)]">
                      {getLocalizedFighterName(result, locale, result.name)}
                    </p>
                    <p className="text-xs font-semibold text-[var(--bp-accent)]">
                      {result.votes} ({result.percentage}%)
                    </p>
                  </div>
                  <div className="retro-meter mt-1.5">
                    <div className="retro-meter-fill" style={{ width: `${result.percentage}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
