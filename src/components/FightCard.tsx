import { Link } from "@/i18n/navigation";
import FightCardPicker from "@/components/FightCardPicker";
import FighterAvatar from "@/components/FighterAvatar";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import { countryCodeToFlag } from "@/lib/flags";
import { translateWeightClass } from "@/lib/weight-class";
import { getTranslations } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";
import { MessageCircle, PartyPopper, Frown } from "lucide-react";
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
  isCompleted,
  predictionResult,
  predictionScore,
  correctLabel,
  wrongLabel,
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
  isCompleted: boolean;
  predictionResult?: "correct" | "wrong" | null;
  predictionScore?: number | null;
  correctLabel: string;
  wrongLabel: string;
}) {
  const displayName = getLocalizedFighterName(fighter, locale, fighter.name);
  const subLabel = getLocalizedFighterSubLabel(fighter, locale);
  const avatarUrl = getFighterAvatarUrl(fighter);
  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-2 rounded-[12px] border p-3 text-center",
        isWinner && "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.06)]",
        isLoser && "border-[var(--bp-line)] bg-[var(--bp-card-inset)] opacity-50",
        !isWinner && !isLoser && "border-[var(--bp-line)] bg-[var(--bp-card-inset)]",
      )}
    >
      {isWinner && (
        <span className="absolute right-2 top-2">
          <RetroLabel size="sm" tone="success">{winLabel}</RetroLabel>
        </span>
      )}
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bp-line)] bg-[#2a2a2a] sm:h-16 sm:w-16">
        {avatarUrl ? (
          <FighterAvatar src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <span className="text-base font-bold text-[var(--bp-muted)]">{fighter.name.charAt(0)}</span>
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--bp-ink)]">{displayName} {countryCodeToFlag(fighter.nationality)}</p>
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
        {bcDivision?.rank ? (
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--bp-accent)]">
            #{bcDivision.rank} {translateWeightClass(bcDivision.weightClass, locale)}
          </p>
        ) : null}
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
}: FightCardProps) {
  const { t, locale } = await getTranslations();
  const isCancelled = fight.status === "cancelled";
  const isNoContest = fight.status === "no_contest";
  const isVoided = isCancelled || isNoContest;
  const isCompleted = isVoided || eventStatus === "completed" || fight.status === "completed";
  const isLive = !isCompleted && (eventStatus === "live" || hasStarted);
  const isUpcoming = !isCompleted && !isLive;

  const winnerA = !!fight.winner_id && fight.winner_id === fight.fighter_a_id;
  const winnerB = !!fight.winner_id && fight.winner_id === fight.fighter_b_id;
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
          <RetroLabel size="md" tone="accent">MAIN EVENT</RetroLabel>
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
              isCompleted={isCompleted}
              predictionResult={prediction && isCompleted && !isVoided && winnerA ? (prediction.is_winner_correct ? "correct" : prediction.is_winner_correct === false ? "wrong" : null) : null}
              predictionScore={prediction?.score}
              correctLabel={t("prediction.correct")}
              wrongLabel={t("prediction.wrong")}
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
              isCompleted={isCompleted}
              predictionResult={prediction && isCompleted && !isVoided && winnerB ? (prediction.is_winner_correct ? "correct" : prediction.is_winner_correct === false ? "wrong" : null) : null}
              predictionScore={prediction?.score}
              correctLabel={t("prediction.correct")}
              wrongLabel={t("prediction.wrong")}
            />
          </div>

          {/* Prediction locked (live only) */}
          {isLive ? (
            <div className="mt-3 rounded-[10px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-3 py-2">
              <p className="text-xs text-[var(--bp-muted)]">{t("event.predictionLocked")}</p>
            </div>
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
