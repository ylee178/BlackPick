"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { useToast } from "@/components/Toast";
import { getLocalizedFighterName, getLocalizedFighterSubLabel } from "@/lib/localized-name";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import FighterAvatar from "@/components/FighterAvatar";
import { countryCodeToFlag } from "@/lib/flags";
import { cn } from "@/lib/utils";
import { translateWeightClass } from "@/lib/weight-class";
import { Check, Pencil } from "lucide-react";
import { RetroLabel } from "@/components/ui/retro";

type FighterData = {
  id: string;
  name: string;
  ring_name?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
  image_url?: string | null;
  record?: string | null;
  nationality?: string | null;
  weight_class?: string | null;
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
  bcPrediction: {
    fighterA_pct: number;
    fighterB_pct: number;
  } | null;
  bcFighterADivision?: { weightClass: string; rank: number | null } | null;
  bcFighterBDivision?: { weightClass: string; rank: number | null } | null;
  initialPrediction: {
    winner_id: string;
    method?: string | null;
    round?: number | null;
  } | null;
};

const methods = ["KO/TKO", "Submission", "Decision"] as const;
const rounds = [1, 2, 3, 4] as const;

function CheckIcon({ className }: { className?: string }) {
  return <Check className={cn("h-3 w-3", className)} strokeWidth={2} />;
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
  bcPrediction,
  bcFighterADivision,
  bcFighterBDivision,
  initialPrediction,
}: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [winnerId, setWinnerId] = useState(initialPrediction?.winner_id ?? "");
  const [method, setMethod] = useState(initialPrediction?.method ?? "");
  const [round, setRound] = useState(initialPrediction?.round ? String(initialPrediction.round) : "");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!initialPrediction);
  const hasSaved = !!initialPrediction;
  const { toast } = useToast();

  function handleCancel() {
    setWinnerId(initialPrediction?.winner_id ?? "");
    setMethod(initialPrediction?.method ?? "");
    setRound(initialPrediction?.round ? String(initialPrediction.round) : "");
  }

  async function handleSubmit() {
    if (!winnerId) return;
    setLoading(true);
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
        toast(data.error || t("prediction.failedToSave"), "error");
        return;
      }
      toast(t("prediction.savedMessage"), "success");
      setIsEditing(false);
      startTransition(() => { router.refresh(); });
    } catch {
      toast(t("common.error"), "error");
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
    const subLabel = getLocalizedFighterSubLabel(fighter, locale);
    const avatarUrl = getFighterAvatarUrl(fighter);
    const bcPct = side === "left" ? bcPrediction?.fighterA_pct : bcPrediction?.fighterB_pct;
    const isPicked = winnerId === fighterId;
    const bcDiv = side === "left" ? bcFighterADivision : bcFighterBDivision;
    const divRank = bcDiv?.rank ?? null;
    const divWeight = bcDiv?.weightClass
      ? translateWeightClass(bcDiv.weightClass, locale)
      : null;

    return (
      <div
        role="radio"
        aria-checked={isPicked}
        aria-label={`${displayName} ${isPicked ? "selected" : ""}`}
        tabIndex={0}
        onClick={() => {
          if (!isEditing) return;
          setWinnerId(fighterId);
        }}
        onKeyDown={(e) => {
          if (!isEditing) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setWinnerId(fighterId);
          }
        }}
        className={cn(
          "flex flex-1 flex-col rounded-[12px] border text-center transition-colors duration-150",
          isPicked
            ? "border-[rgba(229,169,68,0.3)] bg-[var(--bp-card-inset)] fighter-card-selected"
            : "border-[var(--bp-line)] bg-[var(--bp-card-inset)]",
          isEditing && "cursor-pointer",
          isEditing && !isPicked && "hover:border-[var(--bp-line-strong)] hover:bg-[var(--bp-card-hover)]",
          !isEditing && !isPicked && "opacity-50",
        )}
      >
        <div className={cn(
          "relative flex flex-1 flex-col items-center gap-2 p-3 pt-4",
          isPicked && "justify-center",
        )}>
          <div className="absolute right-3 top-3">
            {isPicked ? (
              <RetroLabel
                size="sm"
                tone="neutral"
                icon={<CheckIcon className="h-3.5 w-3.5 text-[#4ade80]" />}
              >My Pick</RetroLabel>
            ) : null}
          </div>

          <div className={cn(
            "flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bp-line)] bg-[#2a2a2a] sm:h-16 sm:w-16",
            isPicked && "avatar-glow",
          )}>
            {avatarUrl ? (
              <FighterAvatar src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-bold text-[var(--bp-muted)]">{fighter.name.charAt(0)}</span>
            )}
          </div>

          <div>
            <p className={cn("text-sm font-bold", isPicked ? "text-[var(--bp-accent)]" : "text-[var(--bp-ink)]")}>
              {displayName} {countryCodeToFlag(fighter.nationality)}
            </p>
            {subLabel ? (
              <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{subLabel}</p>
            ) : null}
            <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{(() => {
              const r = fighter.record || "0-0";
              const parts = r.split("-");
              return parts.length >= 2 ? `${parts[0]}W ${parts[1]}L` : r;
            })()}</p>
            {divRank ? (
              <p className="mt-0.5 text-xs font-semibold text-[var(--bp-accent)]">#{divRank} {divWeight}</p>
            ) : null}
          </div>

          {!isPicked && typeof bcPct === "number" ? (
            <div className="mt-2">
              <p className="flex items-start justify-center text-xl font-extrabold tabular-nums leading-none text-[var(--bp-ink)]">
                {bcPct}<span className="pct-unit text-xs font-semibold text-[var(--bp-muted)]">%</span>
              </p>
              <p className="mt-1 text-[11px] text-[var(--bp-muted)]">{t("event.officialPrediction")}</p>
            </div>
          ) : null}

          {!isPicked && isEditing ? (
            <button
              type="button"
              className="mt-2 w-full cursor-pointer rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] px-2 py-1.5 text-xs font-semibold text-[var(--bp-muted)] transition hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.14)] hover:text-[var(--bp-ink)]"
              onClick={(e) => {
                e.stopPropagation();
                setWinnerId(fighterId);
              }}
            >
              {t("prediction.selectWinner")}
            </button>
          ) : null}
        </div>

        {/* Method/Round options — inside selected card */}
        {isPicked ? (
          <div className="w-full px-3 pb-3 pt-2.5" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-xs font-semibold text-[var(--bp-muted)]">
              {t("prediction.method")}
            </p>
            <div className="grid grid-cols-3 gap-1">
              {methods.map((m) => {
                const active = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={active}
                    disabled={!isEditing}
                    onClick={(e) => { e.stopPropagation(); setMethod(active ? "" : m); }}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-[8px] border px-1 py-2 text-xs font-medium transition-colors duration-150",
                      active
                        ? "border-[rgba(229,169,68,0.3)] bg-[var(--bp-accent-dim)] text-[var(--bp-accent)]"
                        : "border-[var(--bp-line)] text-[var(--bp-muted)]",
                      isEditing && !active && "hover:border-[var(--bp-line-strong)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--bp-ink)] cursor-pointer",
                      !isEditing && !active && "opacity-40",
                    )}
                  >
                    {active ? <CheckIcon className="h-3 w-3 text-[var(--bp-accent)]" /> : null}
                    {m}
                  </button>
                );
              })}
            </div>

            <p className="mb-3 mt-6 text-xs font-semibold text-[var(--bp-muted)]">
              {t("prediction.round")}
            </p>
            <div className="grid grid-cols-4 gap-1">
              {rounds.map((r) => {
                const active = round === String(r);
                return (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={active}
                    disabled={!isEditing}
                    onClick={(e) => { e.stopPropagation(); setRound(active ? "" : String(r)); }}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-[8px] border px-1 py-2 text-xs font-medium transition-colors duration-150",
                      active
                        ? "border-[rgba(229,169,68,0.3)] bg-[var(--bp-accent-dim)] text-[var(--bp-accent)]"
                        : "border-[var(--bp-line)] text-[var(--bp-muted)]",
                      isEditing && !active && "hover:border-[var(--bp-line-strong)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--bp-ink)] cursor-pointer",
                      !isEditing && !active && "opacity-40",
                    )}
                  >
                    {active ? <CheckIcon className="h-3 w-3 text-[var(--bp-accent)]" /> : null}
                    R{r}
                  </button>
                );
              })}
            </div>

            {/* Points preview — shows what you earn at each level */}
            {isEditing ? (() => {
              const hasMethod = !!method;
              const hasRound = !!round;
              const isR4 = round === "4";
              const rows: { label: string; pts: string; active: boolean }[] = [
                { label: t("prediction.pointsWinner"), pts: "+4", active: !!winnerId },
                { label: t("prediction.pointsMethod"), pts: "+4", active: hasMethod },
                { label: t("prediction.pointsRound"), pts: "+8", active: hasRound && !isR4 },
                { label: t("prediction.pointsR4"), pts: "+12", active: hasRound && isR4 },
              ];
              return (
                <div className="mt-3 rounded-[10px] bg-[rgba(255,255,255,0.04)] px-3.5 py-2.5">
                  <div className="space-y-1.5">
                    {rows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className={cn("text-xs", row.active ? "text-[var(--bp-ink)]" : "text-[var(--bp-muted)] opacity-50")}>{row.label}</span>
                        <span className={cn(
                          "text-xs font-bold tabular-nums",
                          row.active
                            ? "text-[#4ade80]"
                            : "text-[var(--bp-muted)] opacity-30"
                        )}>{row.pts}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-[rgba(255,255,255,0.06)] pt-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--bp-danger)]">{t("prediction.wrongPick")}</span>
                    <span className="text-xs font-bold tabular-nums text-[var(--bp-danger)]">-2</span>
                  </div>
                </div>
              );
            })() : null}

            {/* Edit mode: save/cancel buttons */}
            {isEditing ? (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleCancel(); setIsEditing(hasSaved ? false : true); }}
                  className="rounded-[8px] bg-[rgba(255,255,255,0.06)] py-2 text-xs font-semibold text-[var(--bp-muted)] transition hover:bg-[rgba(255,255,255,0.12)] hover:text-[var(--bp-ink)]"
                >
                  {t("discussion.cancel")}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void handleSubmit(); }}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 rounded-[8px] bg-[#2563eb] py-2 text-xs font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
                >
                  {loading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                  {t("prediction.savePick")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] px-3 py-2 text-xs font-semibold text-[var(--bp-ink)] transition hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.14)]"
              >
                <Pencil className="h-3 w-3" strokeWidth={1.8} />
                {t("prediction.editPick")}
              </button>
            )}

          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label={t("prediction.selectWinner")} className="flex flex-col items-stretch gap-2 sm:flex-row sm:gap-3">
      <FighterCard fighter={fighterA} fighterId={fighterAId} side="left" />
      <div className="flex items-center justify-center px-1 py-1 sm:py-0">
        <span className="text-base font-black text-[var(--bp-accent)] sm:text-lg">{t("event.vs")}</span>
      </div>
      <FighterCard fighter={fighterB} fighterId={fighterBId} side="right" />
    </div>
  );
}
