"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildLocalizedAuthPath, getSafeAuthNext } from "@/lib/auth-next";
import { logEvent } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n-provider";
import { useToast } from "@/components/Toast";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";
import { getLocalizedFighterName, getLocalizedFighterSubLabel } from "@/lib/localized-name";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import FighterAvatar from "@/components/FighterAvatar";
import { countryCodeToFlag } from "@/lib/flags";
import { cn } from "@/lib/utils";
import { translateWeightClass } from "@/lib/weight-class";
import { Check, Pencil } from "lucide-react";
import { RetroLabel } from "@/components/ui/retro";
import SignupGateModal from "@/components/SignupGateModal";
import {
  loadPendingPick,
  savePendingPick,
  clearPendingPick,
} from "@/lib/pending-pick";

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
  /**
   * Whether the current viewer has a Supabase session. Anonymous viewers are
   * routed through the signup gate on the first fighter click instead of
   * touching local pick state.
   */
  isAuthenticated: boolean;
};

const methods = ["KO/TKO", "Submission", "Decision"] as const;
const rounds = [1, 2, 3, 4] as const;

function CheckIcon({ className }: { className?: string }) {
  return <Check className={cn("h-3 w-3", className)} strokeWidth={2} />;
}

export default function FightCardPicker({
  fightId,
  fighterA,
  fighterB,
  fighterAId,
  fighterBId,
  bcPrediction,
  bcFighterADivision,
  bcFighterBDivision,
  initialPrediction,
  isAuthenticated,
}: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const initialMethod = initialPrediction?.method ?? "";
  const initialRound = initialPrediction?.round ? String(initialPrediction.round) : "";
  const [winnerId, setWinnerId] = useState(initialPrediction?.winner_id ?? "");
  const [method, setMethod] = useState(initialMethod);
  const [round, setRound] = useState(initialRound);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!initialPrediction);
  const [flowStartTime] = useState(() => Date.now());
  // Latest committed (DB-saved) state. Used as the revert target for Cancel
  // and to drive the "saved" badge after the user starts drafting an opponent.
  const [savedSnapshot, setSavedSnapshot] = useState<
    { winnerId: string; method: string; round: string } | null
  >(() =>
    initialPrediction
      ? {
          winnerId: initialPrediction.winner_id,
          method: initialMethod,
          round: initialRound,
        }
      : null,
  );
  // Per-fighter draft memory. Switching to the opponent after a save shows
  // whatever method/round the user had previously sketched out for that
  // fighter (so they don't lose work when toggling back and forth).
  const [draftByFighter, setDraftByFighter] = useState<
    Record<string, { method: string; round: string }>
  >(() =>
    initialPrediction
      ? {
          [initialPrediction.winner_id]: {
            method: initialMethod,
            round: initialRound,
          },
        }
      : {},
  );
  const hasSaved = savedSnapshot !== null;
  const canSave = !!winnerId && !!method && !!round;
  const { toast } = useToast();

  // Signup-gate modal visibility. Only opens when an anonymous user clicks
  // a fighter — the first and simplest wall we put up before touching state.
  const [signupGateOpen, setSignupGateOpen] = useState(false);

  // Re-edit entries of an existing prediction are tracked by the Edit
  // button click handler below. This effect only handles the fresh-flow
  // case (user arrives at a fight card without a saved prediction).
  const hadInitialPrediction = !!initialPrediction;
  useEffect(() => {
    if (hadInitialPrediction) return;
    logEvent("prediction_flow_entered", { entry_method: "mount" }, { fightId });
    // `fightId` is a stable string prop; `hadInitialPrediction` captures the
    // initial value so this effect fires exactly once per fight card mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore a pending pick after the user returns from OAuth / signup.
  // When an anonymous user clicks a fighter, selectWinner stashes the intent
  // to localStorage and opens the signup gate. The OAuth redirect is a
  // full-page navigation, so after auth the page re-mounts; we check for a
  // matching stash and reapply the selection exactly once.
  //
  // Guards:
  //  - Skip when there's already a saved prediction (initialPrediction)
  //    or any selection on screen — a stale stash should never override a
  //    real committed pick from the DB.
  //  - Depend on [isAuthenticated, fightId] so the effect re-runs if auth
  //    state resolves late (instead of silently losing the pending pick).
  //  - loadPendingPick() returns null after consumption, so subsequent
  //    runs with the same deps are no-ops — idempotent by design.
  useEffect(() => {
    if (!isAuthenticated) return;
    // Don't ambush an existing prediction with a stale stash. If the user
    // has anything committed or drafted, trust that and drop the stash.
    if (initialPrediction || winnerId) {
      clearPendingPick();
      return;
    }
    const pending = loadPendingPick();
    if (!pending || pending.fightId !== fightId) return;
    clearPendingPick();
    setWinnerId(pending.fighterId);
    setDraftByFighter((prev) => ({
      ...prev,
      [pending.fighterId]: prev[pending.fighterId] ?? { method: "", round: "" },
    }));
    setIsEditing(true);
    logEvent(
      "prediction_winner_selected",
      {
        selected_fighter_id: pending.fighterId,
        fighter_position: pending.side,
        restored_after_signup: true,
      },
      { fightId },
    );
    // initialPrediction/winnerId intentionally excluded from deps — they
    // are guards read at effect-run time, not triggers for re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, fightId]);

  function handleCancel() {
    if (savedSnapshot) {
      setWinnerId(savedSnapshot.winnerId);
      setMethod(savedSnapshot.method);
      setRound(savedSnapshot.round);
    } else {
      setWinnerId("");
      setMethod("");
      setRound("");
    }
  }

  // Analytics-aware setters. These wrap the raw state setters and fire the
  // matching analytics event only on explicit user interaction (not on
  // reset/cancel). The spec treats these as the funnel steps.
  function selectWinner(fighterId: string, side: "a" | "b") {
    // Signup gate: anonymous users must sign up before we touch any state.
    // Stash the intent so we can restore it after they return from OAuth,
    // then open the modal and bail out. No winner change, no draft memory
    // mutation, nothing — just park and prompt.
    if (!isAuthenticated) {
      savePendingPick({ fightId, fighterId, side });
      logEvent(
        "signup_gate_shown",
        { fighter_position: side },
        { fightId },
      );
      setSignupGateOpen(true);
      return;
    }
    // Clicking the already-picked fighter while idle re-opens the editor;
    // while editing it's a no-op (the picker is already visible).
    if (fighterId === winnerId) {
      if (!isEditing) setIsEditing(true);
      return;
    }
    // Build the parked map locally so the read for the incoming fighter is
    // consistent with the write for the outgoing fighter (no setState
    // callback / closure interleaving to reason about).
    const parked: Record<string, { method: string; round: string }> = winnerId
      ? { ...draftByFighter, [winnerId]: { method, round } }
      : draftByFighter;
    const incoming = parked[fighterId] ?? { method: "", round: "" };
    setDraftByFighter(parked);
    setWinnerId(fighterId);
    setMethod(incoming.method);
    setRound(incoming.round);
    // Always enter edit mode on a switch so the method/round picker shows
    // on the newly-selected card.
    setIsEditing(true);
    logEvent(
      "prediction_winner_selected",
      { selected_fighter_id: fighterId, fighter_position: side },
      { fightId },
    );
  }

  function selectMethod(value: string) {
    setMethod(value);
    if (winnerId) {
      setDraftByFighter((prev) => ({
        ...prev,
        [winnerId]: { method: value, round },
      }));
    }
    if (value) {
      logEvent(
        "prediction_method_selected",
        { method: value },
        { fightId },
      );
    }
  }

  function selectRound(value: string) {
    setRound(value);
    if (winnerId) {
      setDraftByFighter((prev) => ({
        ...prev,
        [winnerId]: { method, round: value },
      }));
    }
    if (value) {
      logEvent(
        "prediction_round_selected",
        { round: Number(value) },
        { fightId },
      );
    }
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
      if (res.status === 401) {
        const nextPath = getSafeAuthNext(`${window.location.pathname}${window.location.search}`);
        window.location.assign(buildLocalizedAuthPath("login", locale, nextPath));
        return;
      }
      if (!res.ok) {
        toast(data.error || t("prediction.failedToSave"), "error");
        return;
      }
      toast(t("prediction.savedMessage"), "success");
      logEvent(
        "prediction_submitted",
        {
          winner_id: winnerId,
          method: method || null,
          round: round ? Number(round) : null,
          has_method: !!method,
          has_round: !!round,
          time_to_submit_seconds: Math.round((Date.now() - flowStartTime) / 1000),
        },
        { fightId },
      );
      // Commit the new snapshot — this becomes the revert target for any
      // subsequent Cancel and the source of "saved" UI affordances.
      setSavedSnapshot({ winnerId, method, round });
      setDraftByFighter((prev) => ({
        ...prev,
        [winnerId]: { method, round },
      }));
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
          selectWinner(fighterId, side === "left" ? "a" : "b");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectWinner(fighterId, side === "left" ? "a" : "b");
          }
        }}
        className={cn(
          "flex flex-1 flex-col rounded-[12px] border text-center transition-colors duration-150 cursor-pointer",
          isPicked
            ? "border-[rgba(229,169,68,0.3)] bg-[var(--bp-card-inset)] fighter-card-selected"
            : "border-[var(--bp-line)] bg-[var(--bp-card-inset)] hover:border-[var(--bp-line-strong)] hover:bg-[var(--bp-card-hover)]",
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
              >
                {t("prediction.yourPick")}
              </RetroLabel>
            ) : null}
          </div>

          <div className={cn(
            "flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 bg-[#2a2a2a] sm:h-16 sm:w-16",
            // Selected state: solid 2px gold border instead of the
            // animated radial halo. Picked fighters still read as
            // "picked" via the card-level `fighter-card-selected`
            // background + accent-colored name text; the halo was a
            // design overage per DESIGN.md "no glassmorphism, no
            // radiating decorative layers".
            isPicked
              ? "border-[var(--bp-accent)]"
              : "border-[var(--bp-line)]",
          )}>
            {avatarUrl ? (
              <FighterAvatar src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-bold text-[var(--bp-muted)]">{fighter.name.charAt(0)}</span>
            )}
          </div>

          <div className="min-w-0 w-full text-center">
            {/* `break-words` + explicit wrapping so long Hangul /
                Cyrillic / accented names don't truncate on narrow
                mobile widths. The flag sits inline so it wraps
                alongside the last word rather than floating off
                alone on a new line. */}
            <p className={cn("text-sm font-bold break-words", isPicked ? "text-[var(--bp-accent)]" : "text-[var(--bp-ink)]")}>
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
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--bp-accent)]">
                #{divRank} {divWeight}
              </p>
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

          {!isPicked ? (
            <button
              type="button"
              className="mt-2 w-full cursor-pointer rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] px-2 py-1.5 text-xs font-semibold text-[var(--bp-muted)] transition hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.14)] hover:text-[var(--bp-ink)]"
              onClick={(e) => {
                e.stopPropagation();
                selectWinner(fighterId, side === "left" ? "a" : "b");
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
                    onClick={(e) => { e.stopPropagation(); selectMethod(active ? "" : m); }}
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
                    onClick={(e) => { e.stopPropagation(); selectRound(active ? "" : String(r)); }}
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
                  disabled={loading || !canSave}
                  aria-busy={loading}
                  className="flex items-center justify-center gap-1.5 rounded-[8px] bg-[#2563eb] py-2 text-xs font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LoadingButtonContent
                    loading={loading}
                    spinnerClassName="h-3 w-3"
                  >
                    {t("prediction.savePick")}
                  </LoadingButtonContent>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  logEvent(
                    "prediction_flow_entered",
                    { entry_method: "edit_button" },
                    { fightId },
                  );
                }}
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
    <>
      <div role="radiogroup" aria-label={t("prediction.selectWinner")} className="flex flex-col items-stretch gap-2 sm:flex-row sm:gap-3">
        <FighterCard fighter={fighterA} fighterId={fighterAId} side="left" />
        <div className="flex items-center justify-center px-1 py-1 sm:py-0">
          <span className="text-base font-black text-[var(--bp-accent)] sm:text-lg">{t("event.vs")}</span>
        </div>
        <FighterCard fighter={fighterB} fighterId={fighterBId} side="right" />
      </div>
      <SignupGateModal
        open={signupGateOpen}
        onClose={() => {
          // User dismissed the gate without signing up — drop the stash
          // so a future mount (same tab, within TTL) doesn't silently
          // ambush them with the old selection.
          clearPendingPick();
          setSignupGateOpen(false);
        }}
      />
    </>
  );
}
