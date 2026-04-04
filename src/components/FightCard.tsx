import PredictionForm from "@/components/PredictionForm";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import { countryCodeToFlag } from "@/lib/flags";
import { translateWeightClass } from "@/lib/weight-class";
import { getTranslations } from "@/lib/i18n-server";
import { cn } from "@/lib/cn";
import {
  getLocalizedFighterName,
  getLocalizedFighterSubLabel,
  type AppLocale,
} from "@/lib/localized-name";
import {
  RetroMeter,
  RetroStatusBadge,
  retroInsetClassName,
  retroPanelClassName,
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
  fight: {
    id: string;
    fighter_a_id: string;
    fighter_b_id: string;
    start_time: string;
    status: string;
    winner_id?: string | null;
    method?: string | null;
    round?: number | null;
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
  currentUserId?: string | null;
};

function FighterSide({
  fighter,
  align,
  isWinner,
  isLoser,
  isSelected,
  locale,
}: {
  fighter: FighterData;
  align: "left" | "right";
  isWinner: boolean;
  isLoser: boolean;
  isSelected: boolean;
  locale: AppLocale;
}) {
  const textAlign = align === "right" ? "text-right" : "text-left";
  const flexDir = align === "right" ? "flex-row-reverse" : "";
  const displayName = getLocalizedFighterName(fighter, locale, fighter.name);
  const subLabel = getLocalizedFighterSubLabel(fighter, locale);
  const avatarUrl = getFighterAvatarUrl(fighter);

  return (
    <div
      className={cn(
        retroPanelClassName({
          tone: isWinner ? "accent" : isLoser ? "muted" : "default",
          className: "relative p-4",
        }),
        isLoser && "opacity-60",
        isSelected && !isWinner && "translate-y-[-1px]"
      )}
    >
      {/* Win/Loss badge */}
      {isWinner && (
        <RetroStatusBadge tone="success" className="absolute -top-3 right-3">
          WIN
        </RetroStatusBadge>
      )}
      {isLoser && (
        <RetroStatusBadge tone="danger" className="absolute -top-3 right-3">
          LOSS
        </RetroStatusBadge>
      )}

      <div className={`flex items-center gap-3 ${flexDir}`}>
        {/* Avatar */}
        <div className={retroInsetClassName("h-16 w-16 shrink-0 overflow-hidden")}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="retro-avatar h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[9px] uppercase tracking-wider text-[var(--retro-muted)]">
              IMG
            </div>
          )}
        </div>

        {/* Info */}
        <div className={`min-w-0 flex-1 ${textAlign}`}>
          <p
            className="truncate text-lg font-black uppercase text-[var(--retro-ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {displayName} {countryCodeToFlag(fighter.nationality)}
          </p>
          {subLabel && (
            <p className="truncate text-[11px] text-[var(--retro-muted)]">{subLabel}</p>
          )}
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--retro-muted)]" style={{ justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
            <span>{fighter.record || "0-0"}</span>
            {fighter.weight_class && (
              <>
                <span className="text-[var(--retro-muted)]">|</span>
                <span>{translateWeightClass(fighter.weight_class, locale)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function FightCard({
  fight,
  eventStatus,
  hasStarted,
  prediction,
  crowdStats,
}: FightCardProps) {
  const { t, locale } = await getTranslations();

  const isUpcoming = eventStatus === "upcoming" && !hasStarted;
  const isLive = eventStatus === "live" || (eventStatus === "upcoming" && hasStarted);
  const isCompleted = eventStatus === "completed";

  const winnerA = !!fight.winner_id && fight.winner_id === fight.fighter_a_id;
  const winnerB = !!fight.winner_id && fight.winner_id === fight.fighter_b_id;
  const fighterALabel = getLocalizedFighterName(fight.fighter_a, locale, fight.fighter_a.name);
  const fighterBLabel = getLocalizedFighterName(fight.fighter_b, locale, fight.fighter_b.name);

  return (
    <article className={retroPanelClassName({ interactive: true, className: "retro-grid p-5 md:p-6" })}>

      {/* Header row */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="retro-divider w-8" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--retro-muted)]">
            {t("event.fight")}
          </span>
        </div>
        <RetroStatusBadge
          tone={
            fight.status === "completed"
              ? "success"
              : fight.status === "cancelled"
                ? "danger"
                : "info"
          }
        >
          {t(`status.${fight.status}`)}
        </RetroStatusBadge>
      </div>

      {/* Fighter vs Fighter */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        <FighterSide
          fighter={fight.fighter_a}
          align="left"
          isWinner={winnerA}
          isLoser={!!fight.winner_id && !winnerA}
          isSelected={prediction?.winner_id === fight.fighter_a_id}
          locale={locale}
        />

        {/* VS center */}
        <div className="flex flex-col items-center justify-center px-2">
          <div className={retroInsetClassName("flex h-16 w-16 items-center justify-center px-2")}>
            <span
              className="text-2xl font-black text-[var(--retro-accent)] md:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("event.vs")}
            </span>
          </div>
        </div>

        <FighterSide
          fighter={fight.fighter_b}
          align="right"
          isWinner={winnerB}
          isLoser={!!fight.winner_id && !winnerB}
          isSelected={prediction?.winner_id === fight.fighter_b_id}
          locale={locale}
        />
      </div>

      {/* Result section */}
      {isCompleted && fight.winner_id && (
        <div className={retroPanelClassName({ tone: "accent", className: "mt-5 p-4" })}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-black/55">{t("event.result")}</p>
              <p className="mt-1 text-sm font-bold text-[#07111b]">
                {winnerA
                  ? fighterALabel
                  : fighterBLabel}{" "}
                <span className="text-black/60">{t("event.won")}</span>
                {fight.method && <span className="text-black/60"> · {fight.method}</span>}
                {fight.round && <span className="text-black/60"> · R{fight.round}</span>}
              </p>
            </div>
            {prediction && (
              <RetroStatusBadge tone={prediction.is_winner_correct ? "success" : "danger"}>
                {prediction.is_winner_correct ? t("event.win") : t("event.loss")}
                {typeof prediction.score === "number" && ` ${prediction.score}${t("prediction.points")}`}
              </RetroStatusBadge>
            )}
          </div>
        </div>
      )}

      {/* Live: locked message */}
      {isLive && (
        <div className={retroInsetClassName("mt-5 px-4 py-3")}>
          <p className="text-xs font-medium text-[var(--retro-accent)]">{t("event.predictionLocked")}</p>
          {prediction && (
            <p className="mt-1 text-sm text-[var(--retro-muted)]">
              {t("prediction.yourPick")}: <span className="font-bold text-[var(--retro-ink)]">
                {prediction.winner_id === fight.fighter_a_id
                  ? fighterALabel
                  : fighterBLabel}
              </span>
              {prediction.method && ` · ${prediction.method}`}
              {prediction.round && ` · R${prediction.round}`}
            </p>
          )}
        </div>
      )}

      {crowdStats && crowdStats.total_predictions > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <RetroMeter
            label={fighterALabel}
            value={crowdStats.fighter_a_percentage}
            max={100}
            valueLabel={`${crowdStats.fighter_a_percentage}%`}
            tone="info"
          />
          <RetroMeter
            label={fighterBLabel}
            value={crowdStats.fighter_b_percentage}
            max={100}
            valueLabel={`${crowdStats.fighter_b_percentage}%`}
            tone="accent"
          />
        </div>
      ) : null}

      {/* Upcoming: prediction form */}
      {isUpcoming && (
        <div className={retroInsetClassName("mt-5 p-4")}>
          <PredictionForm
            fightId={fight.id}
            fighterA={fight.fighter_a}
            fighterB={fight.fighter_b}
            initialPrediction={prediction}
          />
        </div>
      )}
    </article>
  );
}
