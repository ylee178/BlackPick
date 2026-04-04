"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { getLocalizedFighterName } from "@/lib/localized-name";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import { countryCodeToFlag } from "@/lib/flags";
import { cn } from "@/lib/utils";

type FighterData = {
  id: string;
  name: string;
  ring_name?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
  image_url?: string | null;
  record?: string | null;
  nationality?: string | null;
};

type Props = {
  fightId: string;
  fighterA: FighterData;
  fighterB: FighterData;
  fighterAId: string;
  fighterBId: string;
  crowdStats: {
    fighter_a_percentage: number;
    fighter_b_percentage: number;
    total_predictions: number;
  } | null;
  initialPrediction: {
    winner_id: string;
    method?: string | null;
    round?: number | null;
  } | null;
};

const methods = ["KO/TKO", "Submission", "Decision"] as const;
const rounds = [1, 2, 3, 4] as const;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("h-3 w-3", className)} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

function RadioDot({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <span className="flex h-[18px] w-[18px] min-h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--bp-accent)]">
        <CheckIcon className="h-2.5 w-2.5 text-[var(--bp-bg)]" />
      </span>
    );
  }
  return (
    <span className="block h-[18px] w-[18px] min-h-[18px] min-w-[18px] shrink-0 rounded-full border-2 border-[rgba(255,255,255,0.25)]" />
  );
}

export default function FightCardPicker({
  fightId,
  fighterA,
  fighterB,
  fighterAId,
  fighterBId,
  crowdStats,
  initialPrediction,
}: Props) {
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
    if (!winnerId) return;
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
        setMessageTone("danger");
        return;
      }
      setMessage(t("prediction.savedMessage"));
      setMessageTone("success");
      startTransition(() => { router.refresh(); });
    } catch {
      setMessage(t("common.error"));
      setMessageTone("danger");
    } finally {
      setLoading(false);
    }
  }

  function FighterCard({ fighter, fighterId, side }: {
    fighter: FighterData;
    fighterId: string;
    side: "left" | "right";
  }) {
    const displayName = getLocalizedFighterName(fighter, locale, fighter.name);
    const avatarUrl = getFighterAvatarUrl(fighter);
    const crowdPct = side === "left" ? crowdStats?.fighter_a_percentage : crowdStats?.fighter_b_percentage;
    const isPicked = winnerId === fighterId;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setWinnerId(fighterId);
          setMessage("");
          setMessageTone("neutral");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setWinnerId(fighterId);
            setMessage("");
            setMessageTone("neutral");
          }
        }}
        className={cn(
          "flex flex-1 flex-col rounded-[12px] border text-center transition-colors duration-150 cursor-pointer",
          isPicked
            ? "border-[rgba(229,169,68,0.3)] bg-[var(--bp-card-inset)]"
            : "border-[var(--bp-line)] bg-[var(--bp-card-inset)] hover:border-[var(--bp-line-strong)] hover:bg-[var(--bp-card-hover)]",
        )}
      >
        {/* Fighter info area */}
        <div className="flex flex-col items-center gap-2 p-3">
          {/* Radio dot */}
          <div className="self-end">
            <RadioDot checked={isPicked} />
          </div>

          {/* Avatar */}
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bp-line)] bg-[var(--bp-card)] sm:h-16 sm:w-16">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-bold text-[var(--bp-muted)]">{fighter.name.charAt(0)}</span>
            )}
          </div>

          <div>
            <p className={cn("text-sm font-bold", isPicked ? "text-[var(--bp-accent)]" : "text-[var(--bp-ink)]")}>
              {displayName} {countryCodeToFlag(fighter.nationality)}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--bp-muted)]">
              {fighter.record || "0-0"}
            </p>
          </div>

        </div>

        {/* Inline options — inside selected card, full width */}
        {isPicked ? (
          <div className="w-full px-3 pb-3 pt-2.5" onClick={(e) => e.stopPropagation()}>
            {/* Method */}
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--bp-muted)]">
              {t("prediction.method")}
            </p>
            <div className="grid grid-cols-3 gap-1">
              {methods.map((m) => {
                const active = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMethod(active ? "" : m); }}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-[8px] border px-1 py-2 text-xs font-medium transition-colors duration-150",
                      active
                        ? "border-[rgba(229,169,68,0.3)] bg-[var(--bp-accent-dim)] text-[var(--bp-accent)]"
                        : "border-[var(--bp-line)] text-[var(--bp-muted)] hover:border-[var(--bp-line-strong)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--bp-ink)]"
                    )}
                  >
                    {active ? <CheckIcon className="h-3 w-3 text-[var(--bp-accent)]" /> : null}
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Round */}
            <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--bp-muted)]">
              {t("prediction.round")}
            </p>
            <div className="grid grid-cols-4 gap-1">
              {rounds.map((r) => {
                const active = round === String(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setRound(active ? "" : String(r)); }}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-[8px] border px-1 py-2 text-xs font-medium transition-colors duration-150",
                      active
                        ? "border-[rgba(229,169,68,0.3)] bg-[var(--bp-accent-dim)] text-[var(--bp-accent)]"
                        : "border-[var(--bp-line)] text-[var(--bp-muted)] hover:border-[var(--bp-line-strong)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--bp-ink)]"
                    )}
                  >
                    {active ? <CheckIcon className="h-3 w-3 text-[var(--bp-accent)]" /> : null}
                    {r === 4 ? "OT" : `R${r}`}
                  </button>
                );
              })}
            </div>

            {/* Save + Cancel */}
            <div className="mt-3 grid grid-cols-[1fr_1.2fr] gap-1.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                className="rounded-[8px] bg-[rgba(255,255,255,0.06)] py-2 text-xs font-semibold text-[var(--bp-muted)] transition hover:bg-[rgba(255,255,255,0.12)] hover:text-[var(--bp-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void handleSubmit(); }}
                disabled={loading}
                className="rounded-[8px] bg-[#2563eb] py-2 text-xs font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {loading ? "..." : t("prediction.savePick")}
              </button>
            </div>

            {message ? (
              <p className={cn(
                "mt-2 text-[11px]",
                messageTone === "success" && "text-[var(--bp-success)]",
                messageTone === "danger" && "text-[var(--bp-danger)]",
                messageTone === "neutral" && "text-[var(--bp-muted)]"
              )}>
                {message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <FighterCard fighter={fighterA} fighterId={fighterAId} side="left" />
      <div className="flex flex-col items-center justify-center px-1 pt-10">
        <span className="text-base font-black text-[var(--bp-accent)] sm:text-lg">{t("event.vs")}</span>
      </div>
      <FighterCard fighter={fighterB} fighterId={fighterBId} side="right" />
    </div>
  );
}
