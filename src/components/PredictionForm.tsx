"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-provider";

type Fighter = {
  id: string;
  name: string;
  ring_name?: string | null;
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

function dn(fighter: Fighter) {
  return fighter.ring_name || fighter.name;
}

export default function PredictionForm({
  fightId,
  fighterA,
  fighterB,
  initialPrediction,
}: PredictionFormProps) {
  const { t } = useI18n();
  const [winnerId, setWinnerId] = useState(initialPrediction?.winner_id ?? "");
  const [method, setMethod] = useState(initialPrediction?.method ?? "");
  const [round, setRound] = useState(initialPrediction?.round ? String(initialPrediction.round) : "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
        headers: { "Content-Type": "application/json" },
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
    <div className="space-y-4">
      {/* Fighter select */}
      <div className="grid grid-cols-2 gap-2">
        {[fighterA, fighterB].map((fighter) => {
          const active = winnerId === fighter.id;
          return (
            <button
              key={fighter.id}
              type="button"
              onClick={() => { setWinnerId(fighter.id); setMessage(""); }}
              className={`rounded-lg border p-3 text-left transition-all ${
                active
                  ? "border-[#ffba3c]/40 bg-[#ffba3c]/[0.06] shadow-[0_0_20px_rgba(255,186,60,0.06)]"
                  : "border-white/[0.05] bg-white/[0.02] hover:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-bold uppercase ${active ? "text-[#ffba3c]" : "text-white/60"}`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {dn(fighter)}
                </span>
                <div className={`h-3 w-3 rounded-full border ${
                  active
                    ? "border-[#ffba3c] bg-[#ffba3c]"
                    : "border-white/15 bg-transparent"
                }`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Method/Round — only after winner selected */}
      {winnerId && (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="rounded-lg border border-white/[0.06] bg-black px-3 py-2.5 text-xs text-white/70 outline-none transition focus:border-[#ffba3c]/30"
          >
            <option value="">{t("prediction.noMethod")}</option>
            {methods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="rounded-lg border border-white/[0.06] bg-black px-3 py-2.5 text-xs text-white/70 outline-none transition focus:border-[#ffba3c]/30"
          >
            <option value="">{t("prediction.noRound")}</option>
            {rounds.map((r) => (
              <option key={r} value={r}>{r === 4 ? `4 (${t("prediction.roundOT")})` : `R${r}`}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-[#ffba3c] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#ffd06b] disabled:opacity-50"
          >
            {loading ? "..." : t("prediction.savePick")}
          </button>
        </div>
      )}

      {message && (
        <p className="text-xs text-white/40">{message}</p>
      )}
    </div>
  );
}
