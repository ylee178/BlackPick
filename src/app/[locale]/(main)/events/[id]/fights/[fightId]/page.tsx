import { Link } from "@/i18n/navigation";
import FightCard from "@/components/FightCard";
import FightComments from "@/components/FightComments";
import { fetchBcEventData } from "@/lib/bc-predictions";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedEventName, getLocalizedFighterName } from "@/lib/localized-name";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { retroPanelClassName, RetroStatusBadge, retroChipClassName } from "@/components/ui/retro";
import { getSeriesLabel } from "@/lib/constants";
import type { Database } from "@/types/database";

type FighterRow = Database["public"]["Tables"]["fighters"]["Row"];
type FightRow = Database["public"]["Tables"]["fights"]["Row"];
type PredictionRow = Database["public"]["Tables"]["predictions"]["Row"];
type FightWithFighters = FightRow & { fighter_a: FighterRow; fighter_b: FighterRow };

export const dynamic = "force-dynamic";

export default async function FightDetailPage({
  params,
}: {
  params: Promise<{ id: string; fightId: string }>;
}) {
  const { id: eventId, fightId } = await params;
  const supabase = await createSupabaseServer();
  const user = await getUser();
  const { t, locale } = await getTranslations();

  let userInitial = "?";
  if (user) {
    const { data: dbUser } = await supabase.from("users").select("ring_name").eq("id", user.id).single();
    userInitial = dbUser?.ring_name?.charAt(0) || "?";
  }

  // Fetch event
  const { data: event } = await supabase
    .from("events")
    .select("id, name, date, status, series_type")
    .eq("id", eventId)
    .single();

  if (!event) {
    return (
      <div className={retroPanelClassName({ className: "p-6 text-center text-sm text-[var(--bp-muted)]" })}>
        {t("event.notFound")}
      </div>
    );
  }

  // Fetch all fights for BC data alignment
  const { data: allFights } = await supabase
    .from("fights")
    .select(`
      id, event_id, fighter_a_id, fighter_b_id, start_time, status, winner_id, method, round,
      fighter_a:fighters!fighter_a_id(*),
      fighter_b:fighters!fighter_b_id(*)
    `)
    .eq("event_id", eventId)
    .order("start_time", { ascending: false });

  const typedFights = (allFights ?? []) as FightWithFighters[];
  const fightIndex = typedFights.findIndex((f) => f.id === fightId);
  const fight = typedFights[fightIndex];

  if (!fight) {
    return (
      <div className={retroPanelClassName({ className: "p-6 text-center text-sm text-[var(--bp-muted)]" })}>
        {t("common.noData")}
      </div>
    );
  }

  // Fetch user prediction + crowd stats
  const fightIds = [fightId];
  const [{ data: preds }, { data: statsData }] = await Promise.all([
    user ? supabase.from("predictions").select("*").eq("user_id", user.id).in("fight_id", fightIds) : Promise.resolve({ data: [] as PredictionRow[] }),
    supabase.from("predictions").select("fight_id, winner_id").in("fight_id", fightIds),
  ]);

  const prediction = ((preds ?? []) as PredictionRow[])[0] ?? null;
  const votes = (statsData ?? []) as Array<{ fight_id: string; winner_id: string }>;
  const total = votes.length;
  const aCount = votes.filter((v) => v.winner_id === fight.fighter_a_id).length;
  const crowdStats = {
    fighter_a_percentage: total > 0 ? Math.round((aCount / total) * 100) : 0,
    fighter_b_percentage: total > 0 ? Math.round(((total - aCount) / total) * 100) : 0,
    total_predictions: total,
  };

  // Fetch BC data
  const bcRaw = await fetchBcEventData(event.name);
  const bcFightData = bcRaw.slice(0, typedFights.length);
  const bc = bcFightData[fightIndex] ?? null;

  const eventStatus = event.status as "upcoming" | "live" | "completed";
  const nowTimestamp = Date.now();
  const hasStarted = new Date(fight.start_time).getTime() <= nowTimestamp;
  const localizedEventName = getLocalizedEventName(event, locale, event.name);
  const fighterAName = getLocalizedFighterName(fight.fighter_a, locale, fight.fighter_a.name);
  const fighterBName = getLocalizedFighterName(fight.fighter_b, locale, fight.fighter_b.name);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--bp-muted)]">
        <Link href={`/events/${eventId}`} className="hover:text-[var(--bp-ink)]">
          {localizedEventName}
        </Link>
        <span>/</span>
        <span className="text-[var(--bp-ink)]">{fighterAName} vs {fighterBName}</span>
      </div>

      {/* Fight Card */}
      <FightCard
        index={fightIndex + 1}
        isMainEvent={bc?.isMainEvent || fightIndex === typedFights.length - 1}
        seriesLabel={event.series_type === "black_cup" ? getSeriesLabel(event.series_type, t) : null}
        fight={fight}
        eventStatus={eventStatus}
        hasStarted={hasStarted}
        prediction={prediction}
        crowdStats={crowdStats}
        bcPrediction={bc ? { fighterA_pct: bc.fighterA_pct, fighterB_pct: bc.fighterB_pct } : null}
        bcWeightClass={bc?.weightClass ?? null}
        bcFighterADivision={bc?.fighterA_division ?? null}
        bcFighterBDivision={bc?.fighterB_division ?? null}
        hideDiscussion
      />


      {/* Discussion */}
      <FightComments
        fightId={fightId}
        fightLabel={`${fighterAName} vs ${fighterBName}`}
        currentUserId={user?.id ?? null}
        currentUserInitial={userInitial}
      />
    </div>
  );
}
