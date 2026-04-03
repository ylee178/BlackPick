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

function FighterPanel({
  fighter,
  selected,
  winner,
  loser,
  crowdPercentage,
  labels,
}: {
  fighter: FighterData;
  selected?: boolean;
  winner?: boolean;
  loser?: boolean;
  crowdPercentage?: number;
  labels: {
    win: string;
    loss: string;
    crowdPrediction: string;
    imageFallback: string;
  };
}) {
  return (
    <div
      className={`relative rounded-2xl border p-4 ${
        winner
          ? "border-emerald-500 bg-emerald-500/10"
          : loser
            ? "border-red-500/30 bg-red-500/5 opacity-60"
            : selected
              ? "border-amber-400 bg-amber-400/10"
              : "border-gray-800 bg-gray-950"
      }`}
    >
      {winner && (
        <div className="absolute -top-2 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          {labels.win.toUpperCase()}
        </div>
      )}
      {loser && (
        <div className="absolute -top-2 right-3 rounded-full bg-red-500/80 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          {labels.loss.toUpperCase()}
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 overflow-hidden rounded-xl bg-gray-800">
          {fighter.image_url ? (
            <img
              src={fighter.image_url}
              alt={fighter.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
              {labels.imageFallback}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-white">
            {fighter.ring_name || fighter.name}{" "}
            {countryCodeToFlag(fighter.nationality)}
          </p>
          {fighter.ring_name && fighter.ring_name !== fighter.name && (
            <p className="text-xs text-gray-500">{fighter.name}</p>
          )}
          <p className="text-xs text-gray-400">
            {fighter.record || "—"} {fighter.weight_class ? `• ${fighter.weight_class}` : ""}
          </p>
          <p className="mt-1 text-xs text-amber-400">
            {labels.crowdPrediction} {crowdPercentage ?? 0}%
          </p>
        </div>
      </div>
    </div>
  );
}

function displayName(fighter: FighterData): string {
  return fighter.ring_name || fighter.name;
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

  const labels = {
    win: t("event.win"),
    loss: t("event.loss"),
    crowdPrediction: t("event.crowdPrediction"),
    imageFallback: t("common.imageFallback"),
  };

  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">{t("event.fight")}</p>
          <p className="text-sm text-gray-400">
            {new Date(fight.start_time).toLocaleString()}
          </p>
        </div>
        <div className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300">
          {t(`status.${fight.status}`)}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FighterPanel
          fighter={fight.fighter_a}
          selected={prediction?.winner_id === fight.fighter_a_id}
          winner={!!fight.winner_id && fight.winner_id === fight.fighter_a_id}
          loser={!!fight.winner_id && fight.winner_id !== fight.fighter_a_id}
          crowdPercentage={crowdStats?.fighter_a_percentage}
          labels={labels}
        />
        <FighterPanel
          fighter={fight.fighter_b}
          selected={prediction?.winner_id === fight.fighter_b_id}
          winner={!!fight.winner_id && fight.winner_id === fight.fighter_b_id}
          loser={!!fight.winner_id && fight.winner_id !== fight.fighter_b_id}
          crowdPercentage={crowdStats?.fighter_b_percentage}
          labels={labels}
        />
      </div>

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
        <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950 p-4 text-sm text-gray-300">
          <p className="font-semibold text-amber-400">{t("event.predictionLocked")}</p>
          {prediction ? (
            <p className="mt-2">
              {t("prediction.yourPick")}:{" "}
              <span className="font-semibold text-white">
                {prediction.winner_id === fight.fighter_a_id
                  ? displayName(fight.fighter_a)
                  : displayName(fight.fighter_b)}
              </span>
              {prediction.method ? ` • ${prediction.method}` : ""}
              {prediction.round ? ` • ${t("prediction.round")} ${prediction.round}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-gray-400">{t("prediction.notSubmitted")}</p>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="mt-4 space-y-3 rounded-xl border border-gray-800 bg-gray-950 p-4 text-sm">
          <div>
            <p className="text-gray-400">{t("event.result")}</p>
            <p className="font-semibold text-white">
              {fight.winner_id
                ? `${fight.winner_id === fight.fighter_a_id ? displayName(fight.fighter_a) : displayName(fight.fighter_b)} ${t("event.won")}`
                : fight.status === "cancelled"
                  ? t("event.fightCancelled")
                  : t("event.resultPending")}
              {fight.method ? ` • ${fight.method}` : ""}
              {fight.round ? ` • ${t("prediction.round")} ${fight.round}` : ""}
            </p>
          </div>

          <div>
            <p className="text-gray-400">{t("event.yourPrediction")}</p>
            {prediction ? (
              <div className="space-y-1">
                <p className="text-white">
                  {prediction.winner_id === fight.fighter_a_id
                    ? displayName(fight.fighter_a)
                    : displayName(fight.fighter_b)}
                  {prediction.method ? ` • ${prediction.method}` : ""}
                  {prediction.round ? ` • ${t("prediction.round")} ${prediction.round}` : ""}
                </p>
                <p
                  className={
                    prediction.is_winner_correct
                      ? "font-semibold text-emerald-400"
                      : "font-semibold text-red-400"
                  }
                >
                  {prediction.is_winner_correct ? t("event.win") : t("event.loss")}
                  {typeof prediction.score === "number" ? ` • ${prediction.score} ${t("prediction.points")}` : ""}
                </p>
              </div>
            ) : (
              <p className="text-gray-400">{t("prediction.noPredictionSubmitted")}</p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
