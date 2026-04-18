import { Link } from "@/i18n/navigation";
import FightCardPicker from "@/components/FightCardPicker";
import FighterAvatar from "@/components/FighterAvatar";
import FightScoreCard from "@/components/FightScoreCard";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import { countryCodeToFlag } from "@/lib/flags";
import { translateWeightClass } from "@/lib/weight-class";
import { getTranslations } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";
import { resolveDivisionChip } from "@/lib/division-chip";
import type { BcScoreCard } from "@/lib/bc-official";
import { Check, Crown, MessageCircle, PartyPopper, Frown } from "lucide-react";
import {
  getLocalizedFighterName,
  getLocalizedFighterSubLabel,
  type AppLocale,
} from "@/lib/localized-name";
import {
  RetroLabel,
  retroPanelClassName,
  retroChipClassName,
  retroButtonClassName,
} from "@/components/ui/retro";
import { PointsBadge } from "@/components/ui/ranking";

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
  /** Persisted by `src/scripts/sync-bc-fighter-ranks.ts`. Fallback
   *  source for the static-side portrait chip — live BC data from
   *  `bcFighterADivision`/`bcFighterBDivision` takes priority on
   *  event/fight surfaces while rank sync remains manual. */
  is_champion?: boolean | null;
  rank_position?: number | null;
};

type FightCardProps = {
  index: number;
  variant?: "option-1" | "option-2";
  isMainEvent?: boolean;
  seriesLabel?: string | null;
  fight: {
    id: string;
    event_id?: string;
    fighter_a_id: string;
    fighter_b_id: string;
    start_time: string;
    status: string;
    winner_id?: string | null;
    method?: string | null;
    round?: number | null;
    is_title_fight?: boolean;
    is_main_card?: boolean;
    fighter_a: FighterData;
    fighter_b: FighterData;
  };
  eventStatus: "upcoming" | "live" | "completed";
  hasStarted: boolean;
  prediction: {
    winner_id: string;
    method?: string | null;
    round?: number | null;
    is_winner_correct?: boolean | null;
    is_method_correct?: boolean | null;
    is_round_correct?: boolean | null;
    score?: number | null;
  } | null;
  crowdStats: {
    fighter_a_percentage: number;
    fighter_b_percentage: number;
    total_predictions: number;
  } | null;
  bcPrediction?: {
    fighterA_pct: number;
    fighterB_pct: number;
  } | null;
  bcWeightClass?: string | null;
  bcFighterADivision?: { weightClass: string; rank: number | null } | null;
  bcFighterBDivision?: { weightClass: string; rank: number | null } | null;
  hideDiscussion?: boolean;
  /**
   * Forwarded to FightCardPicker. Anonymous viewers hit a signup gate on
   * the first fighter click; authed viewers get the normal pick flow.
   */
  isAuthenticated: boolean;
  /**
   * BC-published scorecard for decision fights. Caller resolves via
   * `resolveScoreCardsByDbFightId` and passes the `scored` result's
   * `scoreCard` field directly — `null` when BC returned no card or
   * when the resolution was suppressed (non-decision / no-match /
   * no-method). When null, the scorecard section renders nothing.
   */
  scoreCard?: BcScoreCard | null;
};

/** Static (non-interactive) fighter card for completed/live states */
function FighterSideStatic({
  fighter,
  locale,
  bcPct,
  bcDivision,
  isWinner,
  isLoser,
  winMethod,
  winRound,
  winLabel,
  bcLabel,
  championLabel,
  isCompleted,
  predictionResult,
  predictionScore,
  correctLabel,
  wrongLabel,
  isUserPick,
  myPickLabel,
}: {
  fighter: FighterData;
  locale: AppLocale;
  bcPct: number | undefined;
  bcDivision?: { weightClass: string; rank: number | null } | null;
  isWinner: boolean;
  isLoser: boolean;
  winMethod?: string | null;
  winRound?: number | null;
  winLabel: string;
  bcLabel: string;
  championLabel: string;
  isCompleted: boolean;
  predictionResult?: "correct" | "wrong" | null;
  predictionScore?: number | null;
  correctLabel: string;
  wrongLabel: string;
  /**
   * True when the viewer's saved prediction points at this fighter.
   * Drives a "MY PICK" chip that stays visible through the live state
   * so the viewer can remember who they picked before the result is
   * in — addresses the bug where the user's pick disappeared the
   * moment the fight transitioned out of upcoming.
   */
  isUserPick: boolean;
  myPickLabel: string;
}) {
  const displayName = getLocalizedFighterName(fighter, locale, fighter.name);
  const subLabel = getLocalizedFighterSubLabel(fighter, locale);
  const avatarUrl = getFighterAvatarUrl(fighter);
  const divisionChip = resolveDivisionChip(bcDivision, fighter, locale, championLabel);
  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-2 rounded-[12px] border p-3 text-center",
        isWinner && "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.06)]",
        isLoser && "border-[var(--bp-line)] bg-[var(--bp-card-inset)] opacity-50",
        !isWinner && !isLoser && isUserPick && "border-[var(--bp-accent)]/40 bg-[var(--bp-card-inset)]",
        !isWinner && !isLoser && !isUserPick && "border-[var(--bp-line)] bg-[var(--bp-card-inset)]",
      )}
    >
      {isWinner && (
        <span className="absolute right-2 top-2">
          <RetroLabel size="sm" tone="success">{winLabel}</RetroLabel>
        </span>
      )}
      {/* "MY PICK" chip renders for the viewer's saved pick in live
          state (winner not yet known) so the pick stays visible
          across the upcoming → locked transition. Once the winner
          is decided, the existing win/correct/wrong UI takes over
          and this chip yields. Visual contract matches the voting-
          state chip in FightCardPicker exactly — same top-right
          position, same `tone="neutral"` + green check icon — so
          the transition from "voting" to "locked" looks seamless
          to the user. */}
      {isUserPick && !isWinner && !isLoser && (
        <span className="absolute right-2 top-2">
          <RetroLabel
            size="sm"
            tone="neutral"
            icon={<Check className="h-3.5 w-3.5 text-[#4ade80]" strokeWidth={2} />}
          >
            {myPickLabel}
          </RetroLabel>
        </span>
      )}
      {/* Avatar wrapper is `relative` so the division chip anchors to
          its bottom edge. Extra `mb-2` reserves space for the chip's
          `-bottom-2` overhang so it doesn't visually crash into the
          fighter name row below. `pointer-events-none` on the chip
          keeps the avatar's own pointer semantics (hover ring, etc.)
          unaffected. */}
      <div className="relative mb-2">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bp-line)] bg-[#2a2a2a] sm:h-16 sm:w-16">
          {avatarUrl ? (
            <FighterAvatar src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-base font-bold text-[var(--bp-muted)]">{fighter.name.charAt(0)}</span>
          )}
        </div>
        {divisionChip ? (
          <span
            aria-label={[divisionChip.weightLabel, divisionChip.rankLabel]
              .filter(Boolean)
              .join(" ")}
            className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap rounded-full border border-[var(--bp-line)] bg-[var(--bp-bg)]/90 px-1.5 py-[1px] text-[11px] font-semibold backdrop-blur-sm"
          >
            {divisionChip.weightLabel ? (
              <span className="text-[var(--bp-muted)]">{divisionChip.weightLabel}</span>
            ) : null}
            <span className="text-[var(--bp-accent)]">{divisionChip.rankLabel}</span>
          </span>
        ) : null}
      </div>
      <div className="min-w-0 w-full text-center">
        {/* `break-words` + min-w-0 so long names wrap instead of
            truncating on narrow mobile fight cards. The name wraps in
            a Link to the fighter detail page with a gold hover state —
            users can tap through directly from any fight card. */}
        <p className="text-sm font-bold break-words">
          <Link
            href={`/fighters/${fighter.id}`}
            className="text-[var(--bp-ink)] transition-colors hover:text-[var(--bp-accent)]"
          >
            {displayName}
          </Link>{" "}
          {countryCodeToFlag(fighter.nationality)}
        </p>
        {subLabel ? (
          <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{subLabel}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-[var(--bp-muted)]">
          {(() => {
            const r = fighter.record || "0-0";
            const parts = r.split("-");
            return parts.length >= 2 ? `${parts[0]}W ${parts[1]}L` : r;
          })()}
        </p>
      </div>
      {isWinner && (winMethod || winRound) ? (
        <p className="text-xs font-semibold text-[#4ade80]">
          {[winMethod, winRound ? `R${winRound}` : null].filter(Boolean).join(" · ")}
        </p>
      ) : null}
      {/* Compact prediction % for completed, full display for live */}
      {typeof bcPct === "number" ? (
        isCompleted ? (
          <p className="text-[11px] text-[var(--bp-muted)]">
            {bcPct}% {bcLabel}
          </p>
        ) : (
          <div className="mt-2">
            <p className="text-lg font-extrabold tabular-nums text-[var(--bp-ink)]">
              {bcPct}<span className="pct-unit text-xs font-semibold text-[var(--bp-muted)]">%</span>
            </p>
            <p className="mt-1 text-[11px] text-[var(--bp-muted)]">{bcLabel}</p>
          </div>
        )
      ) : null}
      {/* Prediction result at bottom of winner card */}
      {isWinner && predictionResult === "correct" ? (
        <div className="mt-1 flex items-center gap-1">
          <PartyPopper className="h-3.5 w-3.5 shrink-0 text-[#4ade80]" strokeWidth={2} />
          <span className="text-xs font-semibold text-[#4ade80]">{correctLabel}</span>
          {typeof predictionScore === "number" && predictionScore > 0 ? (
            <PointsBadge value={predictionScore} className="ml-1" />
          ) : null}
        </div>
      ) : isWinner && predictionResult === "wrong" ? (
        <div className="mt-1 flex items-center gap-1">
          <Frown className="h-3.5 w-3.5 shrink-0 text-[#f87171]" strokeWidth={2} />
          <span className="text-xs font-semibold text-[#f87171]">{wrongLabel}</span>
          {typeof predictionScore === "number" ? (
            <PointsBadge value={predictionScore} className="ml-1" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default async function FightCard({
  index,
  isMainEvent,
  fight,
  eventStatus,
  hasStarted,
  prediction,
  crowdStats,
  bcPrediction,
  bcWeightClass,
  bcFighterADivision,
  bcFighterBDivision,
  seriesLabel,
  hideDiscussion,
  isAuthenticated,
  scoreCard,
}: FightCardProps) {
  const { t, locale } = await getTranslations();
  const isCancelled = fight.status === "cancelled";
  const isNoContest = fight.status === "no_contest";
  const isVoided = isCancelled || isNoContest;
  const isCompleted = isVoided || eventStatus === "completed" || fight.status === "completed";
  const isLive = !isCompleted && (eventStatus === "live" || hasStarted);
  const isUpcoming = !isCompleted && !isLive;

  // Winner derivation is gated on `isCompleted` because the DevPanel
  // resetFights flow intentionally preserves `fight.winner_id` across
  // state flips (for idempotency — flipping Upcoming → Completed a
  // second time re-uses the existing winner instead of re-randomizing).
  // Without this gate the fight card would show green winner styling +
  // WIN chip + method text even after the user flipped back to
  // Upcoming, because the dormant winner_id value would still be
  // truthy. Reviewer round 1 [blocker 1] fold.
  const winnerA = isCompleted && !!fight.winner_id && fight.winner_id === fight.fighter_a_id;
  const winnerB = isCompleted && !!fight.winner_id && fight.winner_id === fight.fighter_b_id;
  const fighterALabel = getLocalizedFighterName(fight.fighter_a, locale, fight.fighter_a.name);
  const fighterBLabel = getLocalizedFighterName(fight.fighter_b, locale, fight.fighter_b.name);
  const rawWeight = fight.fighter_a.weight_class || fight.fighter_b.weight_class || bcWeightClass;
  const weightLabel = rawWeight ? translateWeightClass(rawWeight, locale) : null;

  return (
    <article aria-label={`${fighterALabel} vs ${fighterBLabel}`} className={retroPanelClassName({ interactive: !isUpcoming, className: "overflow-hidden p-3 sm:p-4" })}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="shrink-0 text-xs font-semibold text-[var(--bp-muted)]">
          {t("event.fight")} {String(index).padStart(2, "0")}
        </span>
        {weightLabel ? <span className={retroChipClassName({ tone: "neutral" })}>{weightLabel}</span> : null}
        {seriesLabel ? <span className={retroChipClassName({ tone: "neutral" })}>{seriesLabel}</span> : null}
        {isMainEvent ? (
          <RetroLabel size="md" tone="accent">{t("event.mainEvent")}</RetroLabel>
        ) : null}
        {/* is_main_card is a secondary flag that distinguishes main-card
            fights from undercard prelims. Hidden when isMainEvent is
            already true to avoid double-chipping the headline fight. */}
        {fight.is_main_card && !isMainEvent ? (
          <RetroLabel size="md" tone="neutral">{t("event.mainCard")}</RetroLabel>
        ) : null}
        {fight.is_title_fight ? (
          <RetroLabel
            size="md"
            tone="accent"
            icon={<Crown className="h-3.5 w-3.5" strokeWidth={2} />}
          >
            {t("event.titleFight")}
          </RetroLabel>
        ) : null}
        {isVoided && (
          <RetroLabel size="md" tone="danger">
            {isCancelled ? t("status.cancelled") : t("status.no_contest")}
          </RetroLabel>
        )}
      </div>

      {/* Upcoming → interactive picker with radio in fighter cards */}
      {isUpcoming ? (
        <div className="mt-3">
          <FightCardPicker
            fightId={fight.id}
            fighterA={fight.fighter_a}
            fighterB={fight.fighter_b}
            fighterAId={fight.fighter_a_id}
            fighterBId={fight.fighter_b_id}
            crowdStats={crowdStats}
            bcPrediction={bcPrediction ?? null}
            bcFighterADivision={bcFighterADivision ?? null}
            bcFighterBDivision={bcFighterBDivision ?? null}
            initialPrediction={prediction}
            isAuthenticated={isAuthenticated}
          />
          {!hideDiscussion && (
            <Link
              href={`/events/${fight.event_id}/fights/${fight.id}`}
              className={retroButtonClassName({ variant: "soft", size: "sm", block: true, className: "mt-3" })}
            >
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
              {t("discussion.title")}
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Live/Completed → static fighter cards */}
          <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:gap-3">
            <FighterSideStatic
              fighter={fight.fighter_a}
              locale={locale}
              bcPct={bcPrediction?.fighterA_pct}
              bcDivision={bcFighterADivision}
              isWinner={winnerA}
              isLoser={winnerB}
              winMethod={winnerA ? fight.method : null}
              winRound={winnerA ? fight.round : null}
              winLabel={t("event.win")}
              bcLabel={t("event.officialPrediction")}
              championLabel={t("division.champion")}
              isCompleted={isCompleted}
              predictionResult={prediction && isCompleted && !isVoided && winnerA ? (prediction.is_winner_correct ? "correct" : prediction.is_winner_correct === false ? "wrong" : null) : null}
              predictionScore={prediction?.score}
              correctLabel={t("prediction.correct")}
              wrongLabel={t("prediction.wrong")}
              isUserPick={prediction?.winner_id === fight.fighter_a_id}
              myPickLabel={t("prediction.yourPick")}
            />
            <div className="flex items-center justify-center px-1 py-1 sm:py-0">
              <span className="text-base font-black text-[var(--bp-accent)] sm:text-lg">{t("event.vs")}</span>
            </div>
            <FighterSideStatic
              fighter={fight.fighter_b}
              locale={locale}
              bcPct={bcPrediction?.fighterB_pct}
              bcDivision={bcFighterBDivision}
              isWinner={winnerB}
              isLoser={winnerA}
              winMethod={winnerB ? fight.method : null}
              winRound={winnerB ? fight.round : null}
              winLabel={t("event.win")}
              bcLabel={t("event.officialPrediction")}
              championLabel={t("division.champion")}
              isCompleted={isCompleted}
              predictionResult={prediction && isCompleted && !isVoided && winnerB ? (prediction.is_winner_correct ? "correct" : prediction.is_winner_correct === false ? "wrong" : null) : null}
              predictionScore={prediction?.score}
              correctLabel={t("prediction.correct")}
              wrongLabel={t("prediction.wrong")}
              isUserPick={prediction?.winner_id === fight.fighter_b_id}
              myPickLabel={t("prediction.yourPick")}
            />
          </div>

          {/* Prediction locked (live only) */}
          {isLive ? (
            <div className="mt-3 rounded-[10px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-3 py-2">
              <p className="text-xs text-[var(--bp-muted)]">{t("event.predictionLocked")}</p>
            </div>
          ) : null}

          {/* BC judges' scorecard — only for completed decision fights.
              `scoreCard == null` covers every suppression reason (non-
              decision method, BC returned no card, name-match ambiguous,
              method not yet entered). `winnerSide` is DB-authoritative:
              completed + no winner_id + not voided ⇒ draw (assumption 13). */}
          {isCompleted && !isVoided && scoreCard ? (
            <FightScoreCard
              scoreCard={scoreCard}
              fighterALabel={fighterALabel}
              fighterBLabel={fighterBLabel}
              winnerSide={winnerA ? "A" : winnerB ? "B" : "draw"}
              labels={{
                title: t("scorecard.title"),
                judge: t("scorecard.judge"),
                total: t("scorecard.total"),
                roundLabel: (round: number) => t("scorecard.roundLabel", { round }),
                overtime: t("scorecard.overtime"),
              }}
            />
          ) : null}

          {!hideDiscussion && (
            <Link
              href={`/events/${fight.event_id}/fights/${fight.id}`}
              className={retroButtonClassName({ variant: "soft", size: "sm", block: true, className: "mt-3" })}
            >
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
              {t("discussion.title")}
            </Link>
          )}
        </>
      )}
    </article>
  );
}
