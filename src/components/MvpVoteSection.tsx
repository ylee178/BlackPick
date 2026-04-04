"use client";

import { useEffect, useMemo, useState } from "react";

type Fighter = {
  id: string;
  name: string;
  image_url?: string | null;
};

type Result = {
  fighter_id: string;
  name: string;
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
      setMessage("Please select a fighter.");
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
        setMessage(data.error || "Failed to submit vote.");
        return;
      }

      setMessage("MVP vote submitted.");
      await loadResults();
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">MVP Vote</h2>
          <p className="text-sm text-gray-400">One vote per event.</p>
        </div>
        <div className="text-xs text-gray-400">Total votes: {totalVotes}</div>
      </div>

      {votingOpen ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {fighters.map((fighter) => {
              const active = selectedFighterId === fighter.id;
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
                      {fighter.image_url ? (
                        <img
                          src={fighter.image_url}
                          alt={fighter.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                          PIXEL
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-white">{fighter.name}</p>
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
              {loading ? "Submitting..." : "Vote MVP"}
            </button>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-gray-400">MVP voting has ended.</p>
      )}

      {message && <p className="mt-3 text-sm text-gray-300">{message}</p>}

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Results
        </h3>
        {results.length === 0 ? (
          <p className="text-sm text-gray-400">No votes yet.</p>
        ) : (
          results.map((result) => (
            <div
              key={result.fighter_id}
              className="rounded-xl border border-gray-800 bg-gray-950 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-semibold text-white">{result.name}</p>
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
