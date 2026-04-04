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

function dn(fighter: FighterData): string {
  return fighter.ring_name || fighter.name;
}

function FighterSide({
  fighter,
  align,
  isWinner,
  isLoser,
  isSelected,
}: {
  fighter: FighterData;
  align: "left" | "right";
  isWinner: boolean;
  isLoser: boolean;
  isSelected: boolean;
}) {
  const textAlign = align === "right" ? "text-right" : "text-left";
  const flexDir = align === "right" ? "flex-row-reverse" : "";

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all ${
        isWinner
          ? "border-[#ffba3c]/40 bg-[#ffba3c]/[0.04]"
          : isLoser
            ? "border-white/[0.03] bg-white/[0.01] opacity-50"
            : isSelected
              ? "border-[#ffba3c]/30 bg-[#ffba3c]/[0.06] shadow-[0_0_30px_rgba(255,186,60,0.08)]"
              : "border-white/[0.05] bg-white/[0.01]"
      }`}
    >
      {/* Win/Loss badge */}
      {isWinner && (
        <div className="absolute -top-2.5 right-3 rounded border border-[#ffba3c]/30 bg-[#ffba3c]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#ffba3c]">
          WIN
        </div>
      )}
      {isLoser && (
        <div className="absolute -top-2.5 right-3 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/55">
          LOSS
        </div>
      )}

      <div className={`flex items-center gap-3 ${flexDir}`}>
        {/* Avatar */}
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/[0.06] bg-black">
          {fighter.image_url ? (
            <img src={fighter.image_url} alt={fighter.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[9px] uppercase tracking-wider text-white/50">
              IMG
            </div>
          )}
        </div>

        {/* Info */}
        <div className={`min-w-0 flex-1 ${textAlign}`}>
          <p
            className="truncate text-lg font-black uppercase text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {dn(fighter)} {countryCodeToFlag(fighter.nationality)}
          </p>
          {fighter.ring_name && fighter.ring_name !== fighter.name && (
            <p className="truncate text-[11px] text-white/55">{fighter.name}</p>
          )}
          <div className="mt-1 flex items-center gap-2 text-[11px] text-white/60" style={{ justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
            <span>{fighter.record || "0-0"}</span>
            {fighter.weight_class && (
              <>
                <span className="text-white/45">|</span>
                <span>{fighter.weight_class}</span>
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
  prediction,
  crowdStats,
}: FightCardProps) {
  const { t } = await getTranslations();

  const hasStarted = new Date(fight.start_time).getTime() <= Date.now();
  const isUpcoming = eventStatus === "upcoming" && !hasStarted;
  const isLive = eventStatus === "live" || (eventStatus === "upcoming" && hasStarted);
  const isCompleted = eventStatus === "completed";

  const winnerA = !!fight.winner_id && fight.winner_id === fight.fighter_a_id;
  const winnerB = !!fight.winner_id && fight.winner_id === fight.fighter_b_id;

  return (
    <article className="gold-hover relative overflow-hidden rounded-2xl border border-white/[0.05] bg-[#0a0a0a] p-5 md:p-6">
      {/* Top line accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffba3c]/15 to-transparent" />

      {/* Header row */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-px w-5 bg-[#ffba3c]/30" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
            {t("event.fight")}
          </span>
        </div>
        <span className={`rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${
          fight.status === "completed"
            ? "border-[#ffba3c]/20 bg-[#ffba3c]/8 text-[#ffba3c]"
            : fight.status === "cancelled"
              ? "border-white/10 text-white/55"
              : "border-white/8 text-white/60"
        }`}>
          {t(`status.${fight.status}`)}
        </span>
      </div>

      {/* Fighter vs Fighter */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        <FighterSide
          fighter={fight.fighter_a}
          align="left"
          isWinner={winnerA}
          isLoser={!!fight.winner_id && !winnerA}
          isSelected={prediction?.winner_id === fight.fighter_a_id}
        />

        {/* VS center */}
        <div className="flex flex-col items-center justify-center px-2">
          <span
            className="text-2xl font-black text-[#ffba3c]/80 md:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            VS
          </span>
        </div>

        <FighterSide
          fighter={fight.fighter_b}
          align="right"
          isWinner={winnerB}
          isLoser={!!fight.winner_id && !winnerB}
          isSelected={prediction?.winner_id === fight.fighter_b_id}
        />
      </div>

      {/* Result section */}
      {isCompleted && fight.winner_id && (
        <div className="mt-5 rounded-lg border border-[#ffba3c]/10 bg-[#ffba3c]/[0.03] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">{t("event.result")}</p>
              <p className="mt-1 text-sm font-bold text-white">
                {winnerA ? dn(fight.fighter_a) : dn(fight.fighter_b)}{" "}
                <span className="text-[#ffba3c]">{t("event.won")}</span>
                {fight.method && <span className="text-white/60"> · {fight.method}</span>}
                {fight.round && <span className="text-white/60"> · R{fight.round}</span>}
              </p>
            </div>
            {prediction && (
              <span className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase ${
                prediction.is_winner_correct
                  ? "border border-[#ffba3c]/20 bg-[#ffba3c]/10 text-[#ffba3c]"
                  : "border border-white/10 bg-white/5 text-white/60"
              }`}>
                {prediction.is_winner_correct ? t("event.win") : t("event.loss")}
                {typeof prediction.score === "number" && ` ${prediction.score}${t("prediction.points")}`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Live: locked message */}
      {isLive && (
        <div className="mt-5 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
          <p className="text-xs font-medium text-[#ffba3c]">{t("event.predictionLocked")}</p>
          {prediction && (
            <p className="mt-1 text-sm text-white/50">
              {t("prediction.yourPick")}: <span className="font-bold text-white">
                {prediction.winner_id === fight.fighter_a_id ? dn(fight.fighter_a) : dn(fight.fighter_b)}
              </span>
              {prediction.method && ` · ${prediction.method}`}
              {prediction.round && ` · R${prediction.round}`}
            </p>
          )}
        </div>
      )}

      {/* Upcoming: prediction form */}
      {isUpcoming && (
        <div className="mt-5">
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
