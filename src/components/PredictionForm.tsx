"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";

type Fighter = {
  id: string;
  name: string;
  ring_name?: string | null;
  image_url?: string | null;
  record?: string | null;
  nationality?: string | null;
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

function displayName(fighter: Fighter) {
  return fighter.ring_name || fighter.name;
}

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

  const selectedFighter = useMemo(() => {
    if (winnerId === fighterA.id) return fighterA;
    if (winnerId === fighterB.id) return fighterB;
    return null;
  }, [winnerId, fighterA, fighterB]);

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
    <div className="rounded-[22px] border border-white/8 bg-[#0B0B0C] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
            {t("event.makeYourPick")}
          </p>
          <p className="mt-1 text-sm text-[#9CA3AF]">{t("prediction.selectWinner")}</p>
        </div>

        {selectedFighter && (
          <div className="inline-flex items-center rounded-full border border-[#E10600]/25 bg-[#E10600]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5F7FA]">
            {displayName(selectedFighter)}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        {[fighterA, fighterB].map((fighter, index) => {
          const active = winnerId === fighter.id;
          const sideLabel = index === 0 ? "A" : "B";

          return (
            <button
              key={fighter.id}
              type="button"
              onClick={() => {
                setWinnerId(fighter.id);
                setMessage("");
              }}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                active
                  ? "border-[#E10600] bg-[#15171A] shadow-[0_0_0_1px_rgba(225,6,0,0.45),0_0_24px_rgba(225,6,0,0.18)]"
                  : "border-white/10 bg-[#15171A] hover:border-white/20"
              }`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_60%)]" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]">
                    {t("event.fight")} {sideLabel}
                  </p>
                  <p
                    className="mt-1 truncate text-xl font-black text-[#F5F7FA]"
                    style={{ fontFamily: "Barlow Condensed, Pretendard, sans-serif" }}
                  >
                    {displayName(fighter)}
                  </p>
                  {fighter.ring_name && fighter.ring_name !== fighter.name && (
                    <p className="truncate text-xs text-[#9CA3AF]">{fighter.name}</p>
                  )}
                </div>

                <div
                  className={`mt-1 h-4 w-4 rounded-full border ${
                    active
                      ? "border-[#E10600] bg-[#E10600] shadow-[0_0_12px_rgba(225,6,0,0.5)]"
                      : "border-white/20 bg-transparent"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {winnerId && (
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
          <label className="block">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
              {t("prediction.method")}
            </span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#15171A] px-4 py-3 text-sm text-[#F5F7FA] outline-none transition focus:border-[#E10600]"
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
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
              {t("prediction.round")}
            </span>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#15171A] px-4 py-3 text-sm text-[#F5F7FA] outline-none transition focus:border-[#E10600]"
            >
              <option value="">{t("prediction.noRound")}</option>
              {rounds.map((item) => (
                <option key={item} value={item}>
                  {item === 4 ? `4 (${t("prediction.roundOT")})` : item}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-[#E10600]/30 bg-[#E10600]/12 px-4 py-3 text-sm font-semibold text-[#F5F7FA] transition hover:bg-[#E10600]/18 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              {loading ? t("common.loading") : t("prediction.savePick")}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="mt-3 text-sm text-[#9CA3AF]">{message}</p>
      )}
    </div>
  );
}
