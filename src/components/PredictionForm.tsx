"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { getLocalizedFighterName } from "@/lib/localized-name";
import { cn } from "@/lib/cn";
import {
  retroButtonClassName,
  retroFieldClassName,
  retroInsetClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

type Fighter = {
  id: string;
  name: string;
  ring_name?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
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
  const { t, locale } = useI18n();
  const [winnerId, setWinnerId] = useState(initialPrediction?.winner_id ?? "");
  const [method, setMethod] = useState(initialPrediction?.method ?? "");
  const [round, setRound] = useState(initialPrediction?.round ? String(initialPrediction.round) : "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "danger">("neutral");

  async function handleSubmit() {
    if (!winnerId) {
      setMessage(t("prediction.selectWinnerMessage"));
      setMessageTone("danger");
      return;
    }
    setLoading(true);
    setMessage("");
    setMessageTone("neutral");
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
        setMessageTone("danger");
        return;
      }
      setMessage(t("prediction.savedMessage"));
      setMessageTone("success");
    } catch {
      setMessage(t("common.error"));
      setMessageTone("danger");
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
              onClick={() => {
                setWinnerId(fighter.id);
                setMessage("");
                setMessageTone("neutral");
              }}
              className={cn(
                retroPanelClassName({
                  tone: active ? "accent" : "muted",
                  interactive: true,
                  className: "p-3 text-left",
                }),
                active && "translate-y-[-1px]"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-bold uppercase ${active ? "text-[#07111b]" : "text-[var(--retro-ink)]"}`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {getLocalizedFighterName(fighter, locale, fighter.name)}
                </span>
                <div
                  className={`h-3.5 w-3.5 border ${
                    active
                      ? "border-[#07111b] bg-[#07111b]"
                      : "border-[var(--retro-line-strong)] bg-transparent"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Method/Round — only after winner selected */}
      {winnerId && (
        <div className={retroInsetClassName("grid gap-2 p-3 sm:grid-cols-[1fr_1fr_auto]")}>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={retroFieldClassName("px-3 py-2.5 text-xs text-[var(--retro-ink)]")}
          >
            <option value="">{t("prediction.noMethod")}</option>
            {methods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className={retroFieldClassName("px-3 py-2.5 text-xs text-[var(--retro-ink)]")}
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
            className={retroButtonClassName({ variant: "primary", className: "min-w-[120px]" })}
          >
            {loading ? "..." : t("prediction.savePick")}
          </button>
        </div>
      )}

      {message && (
        <div
          className={cn(
            retroInsetClassName("px-3 py-2 text-xs"),
            messageTone === "success" && "text-[var(--retro-success)]",
            messageTone === "danger" && "text-[var(--retro-danger)]",
            messageTone === "neutral" && "text-[var(--retro-muted)]"
          )}
        >
          {message}
        </div>
      )}
    </div>
  );
}
