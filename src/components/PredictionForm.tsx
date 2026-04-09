"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { getLocalizedFighterName } from "@/lib/localized-name";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import {
  retroButtonClassName,
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
  theme?: "light" | "dark";
  initialPrediction?: {
    winner_id: string;
    method?: string | null;
    round?: number | null;
  } | null;
};

const methods = ["KO/TKO", "Submission", "Decision"] as const;
const rounds = [1, 2, 3, 4] as const;

function CheckIcon({ className }: { className?: string }) {
  return <Check className={cn("h-3 w-3", className)} strokeWidth={2.5} />;
}

function RadioDot({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--bp-accent)]">
        <CheckIcon className="h-3 w-3 text-[var(--bp-bg)]" />
      </span>
    );
  }
  return (
    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-[var(--bp-line-strong)]" />
  );
}

export default function PredictionForm({
  fightId,
  fighterA,
  fighterB,
  theme = "dark",
  initialPrediction,
}: PredictionFormProps) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [winnerId, setWinnerId] = useState(initialPrediction?.winner_id ?? "");
  const [method, setMethod] = useState(initialPrediction?.method ?? "");
  const [round, setRound] = useState(initialPrediction?.round ? String(initialPrediction.round) : "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "danger">("neutral");

  function handleCancel() {
    setWinnerId(initialPrediction?.winner_id ?? "");
    setMethod(initialPrediction?.method ?? "");
    setRound(initialPrediction?.round ? String(initialPrediction.round) : "");
    setMessage("");
    setMessageTone("neutral");
  }

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
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage(t("common.error"));
      setMessageTone("danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Fighter pick buttons — full width, radio style */}
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
                "flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-left transition",
                active
                  ? "border-[rgba(229,169,68,0.3)] bg-[var(--bp-accent-dim)]"
                  : "border-[var(--bp-line)] bg-[var(--bp-card-inset)] hover:border-[var(--bp-line-strong)]"
              )}
            >
              <span className={cn(
                "truncate text-sm font-semibold",
                active ? "text-[var(--bp-accent)]" : "text-[var(--bp-ink)]"
              )}>
                {getLocalizedFighterName(fighter, locale, fighter.name)}
              </span>
              <RadioDot checked={active} />
            </button>
          );
        })}
      </div>

      {/* Options (only after picking a winner) */}
      {winnerId ? (
        <div className="space-y-3">
          {/* Method tabs */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--bp-muted)]">
              {t("prediction.method")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {methods.map((m) => {
                const active = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(active ? "" : m)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-xs font-medium transition",
                      active
                        ? "border-[rgba(229,169,68,0.3)] bg-[var(--bp-accent-dim)] text-[var(--bp-accent)]"
                        : "border-[var(--bp-line)] text-[var(--bp-muted)] hover:border-[var(--bp-line-strong)] hover:text-[var(--bp-ink)]"
                    )}
                  >
                    {active ? <CheckIcon className="text-[var(--bp-accent)]" /> : null}
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Round tabs */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--bp-muted)]">
              {t("prediction.round")}
            </p>
            <div className="flex gap-1.5">
              {rounds.map((r) => {
                const active = round === String(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRound(active ? "" : String(r))}
                    className={cn(
                      "flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-xs font-medium transition",
                      active
                        ? "border-[rgba(229,169,68,0.3)] bg-[var(--bp-accent-dim)] text-[var(--bp-accent)]"
                        : "border-[var(--bp-line)] text-[var(--bp-muted)] hover:border-[var(--bp-line-strong)] hover:text-[var(--bp-ink)]"
                    )}
                  >
                    {active ? <CheckIcon className="text-[var(--bp-accent)]" /> : null}
                    {r === 4 ? "4 (OT)" : `R${r}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save + Cancel */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={retroButtonClassName({
                variant: "secondary",
                size: "sm",
                block: true,
              })}
            >
              {loading ? "..." : t("prediction.savePick")}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className={retroButtonClassName({
                variant: "ghost",
                size: "sm",
              })}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className={cn(
          "text-xs",
          messageTone === "success" && "text-[var(--bp-success)]",
          messageTone === "danger" && "text-[var(--bp-danger)]",
          messageTone === "neutral" && "text-[var(--bp-muted)]"
        )}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
