import FightCardPicker from "@/components/FightCardPicker";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import { countryCodeToFlag } from "@/lib/flags";
import { translateWeightClass } from "@/lib/weight-class";
import { getTranslations } from "@/lib/i18n-server";
import { cn } from "@/lib/cn";
import {
  getLocalizedFighterName,
  type AppLocale,
} from "@/lib/localized-name";
import {
  RetroStatusBadge,
  retroPanelClassName,
  retroChipClassName,
} from "@/components/ui/retro";

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
  fight: {
    id: string;
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
};

/** Static (non-interactive) fighter card for completed/live states */
function FighterSideStatic({
  fighter,
  locale,
  crowdPct,
  isWinner,
  isLoser,
  isPicked,
  pickLabel,
  winLabel,
}: {
  fighter: FighterData;
  locale: AppLocale;
  crowdPct: number | undefined;
  isWinner: boolean;
  isLoser: boolean;
  isPicked: boolean;
  pickLabel: string;
  winLabel: string;
}) {
  const displayName = getLocalizedFighterName(fighter, locale, fighter.name);
  const avatarUrl = getFighterAvatarUrl(fighter);

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-[12px] border p-3 text-center",
        isWinner && "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.06)]",
        isLoser && "border-[var(--bp-line)] bg-[var(--bp-card-inset)] opacity-50",
        isPicked && !isWinner && !isLoser && "border-[rgba(229,169,68,0.3)] bg-[var(--bp-accent-dim)]",
        !isWinner && !isLoser && !isPicked && "border-[var(--bp-line)] bg-[var(--bp-card-inset)]",
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bp-line)] bg-[var(--bp-card)] sm:h-16 sm:w-16">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <span className="text-base font-bold text-[var(--bp-muted)]">{fighter.name.charAt(0)}</span>
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--bp-ink)]">{displayName}</p>
        <p className="mt-0.5 text-[11px] text-[var(--bp-muted)]">
          {fighter.record || "0-0"} {countryCodeToFlag(fighter.nationality)}
        </p>
      </div>
      {isPicked ? (
        <span className="text-[10px] font-bold uppercase text-[var(--bp-accent)]">{pickLabel}</span>
      ) : isWinner ? (
        <span className="text-[10px] font-bold uppercase text-[var(--bp-success)]">{winLabel}</span>
      ) : null}
    </div>
  );
}

export default async function FightCard({
  index,
  fight,
  eventStatus,
  hasStarted,
  prediction,
  crowdStats,
}: FightCardProps) {
  const { t, locale } = await getTranslations();
  const isCancelled = fight.status === "cancelled";
  const isCompleted = isCancelled || eventStatus === "completed" || fight.status === "completed";
  const isLive = !isCompleted && (eventStatus === "live" || hasStarted);
  const isUpcoming = !isCompleted && !isLive;

  const winnerA = !!fight.winner_id && fight.winner_id === fight.fighter_a_id;
  const winnerB = !!fight.winner_id && fight.winner_id === fight.fighter_b_id;
  const fighterALabel = getLocalizedFighterName(fight.fighter_a, locale, fight.fighter_a.name);
  const fighterBLabel = getLocalizedFighterName(fight.fighter_b, locale, fight.fighter_b.name);
  const predictedLabel = prediction
    ? prediction.winner_id === fight.fighter_a_id ? fighterALabel : fighterBLabel
    : null;
  const predictionDetail = [predictedLabel, prediction?.method, prediction?.round ? `R${prediction.round}` : null]
    .filter(Boolean).join(" · ");
  const resultLabel = isCancelled
    ? t("event.fightCancelled")
    : fight.winner_id
      ? `${winnerA ? fighterALabel : fighterBLabel} ${t("event.won")}${fight.method ? ` · ${fight.method}` : ""}${fight.round ? ` · R${fight.round}` : ""}`
      : t("event.resultPending");

  const statusTone = isCancelled ? "danger" : isCompleted ? "success" : isLive ? "danger" : "info";
  const weightLabel = fight.fighter_a.weight_class ? translateWeightClass(fight.fighter_a.weight_class, locale) : null;
  const isTitleFight = (fight as { is_title_fight?: boolean }).is_title_fight;

  return (
    <article className={retroPanelClassName({ interactive: !isUpcoming, className: "overflow-hidden p-3 sm:p-4" })}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[var(--bp-muted)]">
            {t("event.fight")} {String(index).padStart(2, "0")}
          </span>
          {weightLabel ? <span className={retroChipClassName({ tone: "neutral" })}>{weightLabel}</span> : null}
          {isTitleFight ? <span className={retroChipClassName()}>TITLE</span> : null}
        </div>
        <RetroStatusBadge tone={statusTone}>{t(`status.${fight.status}`)}</RetroStatusBadge>
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
            initialPrediction={prediction}
          />
        </div>
      ) : (
        <>
          {/* Live/Completed → static fighter cards */}
          <div className="mt-3 flex items-stretch gap-2 sm:gap-3">
            <FighterSideStatic
              fighter={fight.fighter_a}
              locale={locale}
              crowdPct={crowdStats?.fighter_a_percentage}
              isWinner={winnerA}
              isLoser={winnerB}
              isPicked={!!prediction && prediction.winner_id === fight.fighter_a_id}
              pickLabel={t("prediction.yourPick")}
              winLabel={t("event.win")}
            />
            <div className="flex flex-col items-center justify-center px-1">
              <span className="text-base font-black text-[var(--bp-accent)] sm:text-lg">{t("event.vs")}</span>
            </div>
            <FighterSideStatic
              fighter={fight.fighter_b}
              locale={locale}
              crowdPct={crowdStats?.fighter_b_percentage}
              isWinner={winnerB}
              isLoser={winnerA}
              isPicked={!!prediction && prediction.winner_id === fight.fighter_b_id}
              pickLabel={t("prediction.yourPick")}
              winLabel={t("event.win")}
            />
          </div>

          {/* Result bar */}
          <div className="mt-3 rounded-[10px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[var(--bp-muted)]">
                {isCompleted ? resultLabel : isLive ? t("event.predictionLocked") : ""}
              </p>
              {prediction && !isCancelled ? (
                <RetroStatusBadge tone={prediction.is_winner_correct ? "success" : prediction.is_winner_correct === false ? "danger" : "neutral"}>
                  {prediction.is_winner_correct ? t("event.win") : prediction.is_winner_correct === false ? t("event.loss") : t("common.pending")}
                  {typeof prediction.score === "number" ? ` ${prediction.score}pt` : ""}
                </RetroStatusBadge>
              ) : null}
            </div>
            {prediction ? (
              <p className="mt-1 text-xs text-[var(--bp-muted)]">
                {t("prediction.yourPick")}: <span className="text-[var(--bp-ink)]">{predictionDetail || predictedLabel}</span>
              </p>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}
