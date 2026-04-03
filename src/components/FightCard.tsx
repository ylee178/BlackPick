import PredictionForm from "@/components/PredictionForm";
import { countryCodeToFlag } from "@/lib/flags";

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
  crowdPercentage,
}: {
  fighter: FighterData;
  selected?: boolean;
  winner?: boolean;
  crowdPercentage?: number;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        winner
          ? "border-emerald-500 bg-emerald-500/10"
          : selected
            ? "border-amber-400 bg-amber-400/10"
            : "border-gray-800 bg-gray-950"
      }`}
    >
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
              PIXEL
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
            Crowd {crowdPercentage ?? 0}%
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FightCard({
  fight,
  eventStatus,
  prediction,
  crowdStats,
}: FightCardProps) {
  const hasStarted = new Date(fight.start_time).getTime() <= Date.now();
  const isUpcoming = eventStatus === "upcoming" && !hasStarted;
  const isLive = eventStatus === "live" || (eventStatus === "upcoming" && hasStarted);
  const isCompleted = eventStatus === "completed";

  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">Fight</p>
          <p className="text-sm text-gray-400">
            {new Date(fight.start_time).toLocaleString()}
          </p>
        </div>
        <div className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300">
          {fight.status}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FighterPanel
          fighter={fight.fighter_a}
          selected={prediction?.winner_id === fight.fighter_a_id}
          winner={fight.winner_id === fight.fighter_a_id}
          crowdPercentage={crowdStats?.fighter_a_percentage}
        />
        <FighterPanel
          fighter={fight.fighter_b}
          selected={prediction?.winner_id === fight.fighter_b_id}
          winner={fight.winner_id === fight.fighter_b_id}
          crowdPercentage={crowdStats?.fighter_b_percentage}
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
          <p className="font-semibold text-amber-400">Predictions Locked</p>
          {prediction ? (
            <p className="mt-2">
              Your pick:{" "}
              <span className="font-semibold text-white">
                {prediction.winner_id === fight.fighter_a_id
                  ? fight.fighter_a.name
                  : fight.fighter_b.name}
              </span>
              {prediction.method ? ` • ${prediction.method}` : ""}
              {prediction.round ? ` • Round ${prediction.round}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-gray-400">You did not submit a prediction.</p>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="mt-4 space-y-3 rounded-xl border border-gray-800 bg-gray-950 p-4 text-sm">
          <div>
            <p className="text-gray-400">Result</p>
            <p className="font-semibold text-white">
              {fight.winner_id
                ? `${fight.winner_id === fight.fighter_a_id ? fight.fighter_a.name : fight.fighter_b.name} won`
                : fight.status === "cancelled"
                  ? "Fight cancelled"
                  : "Result pending"}
              {fight.method ? ` • ${fight.method}` : ""}
              {fight.round ? ` • Round ${fight.round}` : ""}
            </p>
          </div>

          <div>
            <p className="text-gray-400">Your Prediction</p>
            {prediction ? (
              <div className="space-y-1">
                <p className="text-white">
                  {prediction.winner_id === fight.fighter_a_id
                    ? fight.fighter_a.name
                    : fight.fighter_b.name}
                  {prediction.method ? ` • ${prediction.method}` : ""}
                  {prediction.round ? ` • Round ${prediction.round}` : ""}
                </p>
                <p
                  className={
                    prediction.is_winner_correct
                      ? "font-semibold text-emerald-400"
                      : "font-semibold text-red-400"
                  }
                >
                  {prediction.is_winner_correct ? "Win" : "Loss"}
                  {typeof prediction.score === "number" ? ` • ${prediction.score} pts` : ""}
                </p>
              </div>
            ) : (
              <p className="text-gray-400">No prediction submitted.</p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
