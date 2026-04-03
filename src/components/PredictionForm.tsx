"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-provider";

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
  const { t } = useI18n();
  const [winnerId, setWinnerId] = useState<string>(initialPrediction?.winner_id ?? "");
  const [method, setMethod] = useState<string>(initialPrediction?.method ?? "");
  const [round, setRound] = useState<string>(
    initialPrediction?.round ? String(initialPrediction.round) : ""
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  async function handleSubmit() {
    if (!winnerId) {
      setMessage(t("prediction.selectWinnerMessage"));
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
        setMessage(data.error || t("prediction.failedToSave"));
        return;
      }

      setMessage(t("prediction.savedMessage"));
    } catch {
      setMessage(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <p className="text-sm font-semibold text-white">{t("event.makeYourPick")}</p>

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
              <span className="mt-1 block text-xs text-gray-400">{t("prediction.selectWinner")}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-400">
            {t("prediction.method")}
          </span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none ring-0"
          >
            <option value="">{t("prediction.noMethod")}</option>
            {methods.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-400">
            {t("prediction.round")}
          </span>
          <select
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none ring-0"
          >
            <option value="">{t("prediction.noRound")}</option>
            {rounds.map((item) => (
              <option key={item} value={item}>
                {item === 4 ? `4 (${t("prediction.roundOT")})` : item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          {t("prediction.editUntilStart")}
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t("common.loading") : t("prediction.savePick")}
        </button>
      </div>

      {message && <p className="mt-3 text-sm text-gray-300">{message}</p>}
    </div>
  );
}
