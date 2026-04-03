"use client";

import { useState } from "react";

type Fighter = {
  id: string;
  name: string;
  image_url?: string | null;
};

type PredictionFormProps = {
  fightId: string;
  fighterA: Fighter;
  fighterB: Fighter;
  initialPrediction?: {
    winner_id: string;
    method?: string | null;
    round?: number | null;
  } | null;
};

const methods = ["KO/TKO", "Submission", "Decision"] as const;
const rounds = [1, 2, 3, 4] as const;

export default function PredictionForm({
  fightId,
  fighterA,
  fighterB,
  initialPrediction,
}: PredictionFormProps) {
  const [winnerId, setWinnerId] = useState<string>(initialPrediction?.winner_id ?? "");
  const [method, setMethod] = useState<string>(initialPrediction?.method ?? "");
  const [round, setRound] = useState<string>(
    initialPrediction?.round ? String(initialPrediction.round) : ""
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  async function handleSubmit() {
    if (!winnerId) {
      setMessage("Please select a winner.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fight_id: fightId,
          winner_id: winnerId,
          method: method || null,
          round: round ? Number(round) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to save prediction.");
        return;
      }

      setMessage("Prediction saved.");
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <p className="text-sm font-semibold text-white">Make your pick</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[fighterA, fighterB].map((fighter) => {
          const active = winnerId === fighter.id;
          return (
            <button
              key={fighter.id}
              type="button"
              onClick={() => setWinnerId(fighter.id)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                active
                  ? "border-amber-400 bg-amber-400/10 text-white"
                  : "border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-700"
              }`}
            >
              <span className="block font-semibold">{fighter.name}</span>
              <span className="mt-1 block text-xs text-gray-400">Pick winner</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-400">
            Method
          </span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none ring-0"
          >
            <option value="">No method</option>
            {methods.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-400">
            Round
          </span>
          <select
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none ring-0"
          >
            <option value="">No round</option>
            {rounds.map((item) => (
              <option key={item} value={item}>
                {item === 4 ? "4 (OT)" : item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          You can edit your pick until fight start.
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Pick"}
        </button>
      </div>

      {message && <p className="mt-3 text-sm text-gray-300">{message}</p>}
    </div>
  );
}
