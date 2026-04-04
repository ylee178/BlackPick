"use client";

import { useEffect, useMemo, useState } from "react";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import { useI18n } from "@/lib/i18n-provider";
import { getLocalizedFighterName } from "@/lib/localized-name";

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
  fighters: Fighter[];
};

export default function MvpVoteSection({ eventId, eventDate, fighters }: Props) {
  const { locale, t } = useI18n();
  const [selectedFighterId, setSelectedFighterId] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const votingOpen = useMemo(() => {
    const deadline = new Date(`${eventDate}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000;
    return Date.now() <= deadline;
  }, [eventDate]);

  async function loadResults() {
    try {
      const res = await fetch(`/api/mvp-vote?event_id=${eventId}`);
      const data = await res.json();
      if (res.ok) {
        setResults(data.results ?? []);
        setTotalVotes(data.total_votes ?? 0);
      }
    } catch {}
  }

  useEffect(() => {
    loadResults();
  }, [eventId]);

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: eventId,
          fighter_id: selectedFighterId,
        }),
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
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{t("event.mvpVote")}</h2>
          <p className="text-sm text-gray-400">{t("mvp.oneVotePerEvent")}</p>
        </div>
        <div className="text-xs text-gray-400">{t("mvp.totalVotes")}: {totalVotes}</div>
      </div>

      {votingOpen ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {fighters.map((fighter) => {
              const active = selectedFighterId === fighter.id;
              const fighterLabel = getLocalizedFighterName(fighter, locale, fighter.name);
              const avatarUrl = getFighterAvatarUrl(fighter);
              return (
                <button
                  key={fighter.id}
                  type="button"
                  onClick={() => setSelectedFighterId(fighter.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-amber-400 bg-amber-400/10"
                      : "border-gray-800 bg-gray-950 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-800">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={fighterLabel}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                          PIXEL
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-white">{fighterLabel}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={handleVote}
              disabled={loading}
              className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {loading ? t("mvp.submitting") : t("mvp.vote")}
            </button>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-gray-400">{t("mvp.ended")}</p>
      )}

      {message && <p className="mt-3 text-sm text-gray-300">{message}</p>}

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          {t("mvp.results")}
        </h3>
        {results.length === 0 ? (
          <p className="text-sm text-gray-400">{t("mvp.noVotesYet")}</p>
        ) : (
          results.map((result) => (
            <div
              key={result.fighter_id}
              className="rounded-xl border border-gray-800 bg-gray-950 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-semibold text-white">
                  {getLocalizedFighterName(result, locale, result.name)}
                </p>
                <p className="text-sm text-amber-400">
                  {result.votes} votes • {result.percentage}%
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${result.percentage}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
