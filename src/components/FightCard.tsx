import PredictionForm from "@/components/PredictionForm";
import { countryCodeToFlag } from "@/lib/flags";
import { getTranslations } from "@/lib/i18n-server";

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

function displayName(fighter: FighterData): string {
  return fighter.ring_name || fighter.name;
}

function formatFightTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString();
}

function FighterSide({
  fighter,
  side,
  selected,
  winner,
  loser,
  compact,
  labels,
}: {
  fighter: FighterData;
  side: "left" | "right";
  selected?: boolean;
  winner?: boolean;
  loser?: boolean;
  compact?: boolean;
  labels: {
    win: string;
    loss: string;
    imageFallback: string;
  };
}) {
  const align =
    side === "left"
      ? "items-start text-left"
      : "items-end text-right";

  const borderClass = winner
    ? "border-[#C9A96A] shadow-[0_0_0_1px_rgba(201,169,106,0.35),0_0_28px_rgba(201,169,106,0.18)]"
    : loser
      ? "border-white/10 opacity-55"
      : selected
        ? "border-[#E10600] shadow-[0_0_0_1px_rgba(225,6,0,0.45),0_0_24px_rgba(225,6,0,0.22)]"
        : "border-white/10 hover:border-white/20";

  return (
    <div
      className={`relative overflow-hidden rounded-[22px] border bg-[#15171A] transition-all duration-200 ${borderClass} ${
        compact ? "p-3" : "p-4 md:p-5"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%)]" />
      <div className={`relative flex gap-3 ${side === "right" ? "flex-row-reverse" : ""}`}>
        <div
          className={`overflow-hidden rounded-2xl bg-[#0B0B0C] ring-1 ring-white/8 ${
            compact ? "h-14 w-14" : "h-16 w-16 md:h-20 md:w-20"
          }`}
        >
          {fighter.image_url ? (
            <img
              src={fighter.image_url}
              alt={fighter.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF]">
              {labels.imageFallback}
            </div>
          )}
        </div>

        <div className={`min-w-0 flex-1 ${align}`}>
          <div className="flex items-start justify-between gap-2">
            <div className={`min-w-0 flex-1 ${align}`}>
              <p
                className={`truncate font-semibold uppercase tracking-[0.18em] text-[#9CA3AF] ${
                  compact ? "text-[10px]" : "text-[11px]"
                }`}
              >
                {fighter.record || "—"}
              </p>
              <h3
                className={`truncate text-[#F5F7FA] ${
                  compact ? "text-lg font-black" : "text-xl font-black md:text-2xl"
                }`}
                style={{ fontFamily: "Barlow Condensed, Pretendard, sans-serif" }}
              >
                {displayName(fighter)}
              </h3>
              {fighter.ring_name && fighter.ring_name !== fighter.name && (
                <p className="truncate text-xs text-[#9CA3AF]">{fighter.name}</p>
              )}
            </div>

            <div className="shrink-0 text-lg leading-none">
              {countryCodeToFlag(fighter.nationality)}
            </div>
          </div>

          <div
            className={`mt-3 flex flex-wrap gap-2 ${
              side === "right" ? "justify-end" : "justify-start"
            }`}
          >
            {winner && (
              <span className="inline-flex items-center rounded-full border border-[#C9A96A]/40 bg-[#C9A96A]/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A96A]">
                W
              </span>
            )}
            {loser && (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
                L
              </span>
            )}
            {fighter.weight_class && !compact && (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#9CA3AF]">
                {fighter.weight_class}
              </span>
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
  prediction,
  crowdStats,
}: FightCardProps) {
  const { t } = await getTranslations();

  const hasStarted = new Date(fight.start_time).getTime() <= Date.now();
  const isUpcoming = eventStatus === "upcoming" && !hasStarted;
  const isLive = eventStatus === "live" || (eventStatus === "upcoming" && hasStarted);
  const isCompleted = eventStatus === "completed";
  const compact =
    !isCompleted &&
    !prediction &&
    !crowdStats &&
    !fight.method &&
    !fight.round;

  const labels = {
    win: t("event.win"),
    loss: t("event.loss"),
    imageFallback: t("common.imageFallback"),
  };

  const resultText = fight.winner_id
    ? `${fight.winner_id === fight.fighter_a_id ? displayName(fight.fighter_a) : displayName(fight.fighter_b)} ${t("event.won")}`
    : fight.status === "cancelled"
      ? t("event.fightCancelled")
      : t("event.resultPending");

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#15171A]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(225,6,0,0.08),transparent_28%,transparent_72%,rgba(201,169,106,0.06))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className={`${compact ? "p-4" : "p-5 md:p-6"}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9CA3AF]">
              {t("event.fight")}
            </p>
            <p className="mt-1 text-sm text-[#9CA3AF]">{formatFightTime(fight.start_time)}</p>
          </div>

          <div className="inline-flex items-center rounded-full border border-white/10 bg-[#0B0B0C] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F5F7FA]">
            {t(`status.${fight.status}`)}
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)] items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]">
          <FighterSide
            fighter={fight.fighter_a}
            side="left"
            selected={prediction?.winner_id === fight.fighter_a_id}
            winner={!!fight.winner_id && fight.winner_id === fight.fighter_a_id}
            loser={!!fight.winner_id && fight.winner_id !== fight.fighter_a_id}
            compact={compact}
            labels={labels}
          />

          <div className="flex flex-col items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-[#0B0B0C] px-2 py-4 text-center">
            <div
              className="text-3xl font-black uppercase leading-none text-[#E10600] md:text-4xl"
              style={{ fontFamily: "Barlow Condensed, Pretendard, sans-serif" }}
            >
              VS
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF]">
                {fight.fighter_a.weight_class || fight.fighter_b.weight_class || "—"}
              </p>
              <p
                className="text-sm font-semibold text-[#F5F7FA]"
                style={{ fontFamily: "Barlow Condensed, Pretendard, sans-serif" }}
              >
                {new Date(fight.start_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <FighterSide
            fighter={fight.fighter_b}
            side="right"
            selected={prediction?.winner_id === fight.fighter_b_id}
            winner={!!fight.winner_id && fight.winner_id === fight.fighter_b_id}
            loser={!!fight.winner_id && fight.winner_id !== fight.fighter_b_id}
            compact={compact}
            labels={labels}
          />
        </div>

        {crowdStats && (
          <div className="mt-4 rounded-2xl border border-white/8 bg-[#0B0B0C] p-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF]">
              <span>{displayName(fight.fighter_a)}</span>
              <span>{crowdStats.total_predictions} {t("prediction.totalPredictions")}</span>
              <span>{displayName(fight.fighter_b)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
              <div className="flex h-full w-full">
                <div
                  className="h-full bg-[#E10600]"
                  style={{ width: `${crowdStats.fighter_a_percentage}%` }}
                />
                <div
                  className="h-full bg-[#C9A96A]"
                  style={{ width: `${crowdStats.fighter_b_percentage}%` }}
                />
              </div>
            </div>
            <div
              className="mt-2 flex items-center justify-between text-sm font-semibold text-[#F5F7FA]"
              style={{ fontFamily: "Barlow Condensed, Pretendard, sans-serif" }}
            >
              <span>{crowdStats.fighter_a_percentage}%</span>
              <span>{crowdStats.fighter_b_percentage}%</span>
            </div>
          </div>
        )}

        {isUpcoming && (
          <div className="mt-4">
            <PredictionForm
              fightId={fight.id}
              fighterA={fight.fighter_a}
              fighterB={fight.fighter_b}
              initialPrediction={prediction}
            />
          </div>
        )}

        {isLive && (
          <div className="mt-4 rounded-2xl border border-[#E10600]/25 bg-[#0B0B0C] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E10600]">
              {t("event.predictionLocked")}
            </p>
            {prediction ? (
              <p className="mt-2 text-sm text-[#F5F7FA]">
                {t("prediction.yourPick")}:{" "}
                <span className="font-semibold">
                  {prediction.winner_id === fight.fighter_a_id
                    ? displayName(fight.fighter_a)
                    : displayName(fight.fighter_b)}
                </span>
                {prediction.method ? ` • ${prediction.method}` : ""}
                {prediction.round ? ` • ${t("prediction.round")} ${prediction.round}` : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#9CA3AF]">{t("prediction.notSubmitted")}</p>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/8 bg-[#0B0B0C] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
                {t("event.result")}
              </p>
              <p className="mt-2 text-base font-semibold text-[#F5F7FA]">
                {resultText}
                {fight.method ? ` • ${fight.method}` : ""}
                {fight.round ? ` • ${t("prediction.round")} ${fight.round}` : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#0B0B0C] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
                {t("event.yourPrediction")}
              </p>
              {prediction ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-[#F5F7FA]">
                    {prediction.winner_id === fight.fighter_a_id
                      ? displayName(fight.fighter_a)
                      : displayName(fight.fighter_b)}
                    {prediction.method ? ` • ${prediction.method}` : ""}
                    {prediction.round ? ` • ${t("prediction.round")} ${prediction.round}` : ""}
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      prediction.is_winner_correct ? "text-[#C9A96A]" : "text-[#E10600]"
                    }`}
                  >
                    {prediction.is_winner_correct ? t("event.win") : t("event.loss")}
                    {typeof prediction.score === "number"
                      ? ` • ${prediction.score} ${t("prediction.points")}`
                      : ""}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#9CA3AF]">
                  {t("prediction.noPredictionSubmitted")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
