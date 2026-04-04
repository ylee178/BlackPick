import FightCard from "@/components/FightCard";
import FlipTimer from "@/components/FlipTimer";
import MvpVoteSection from "@/components/MvpVoteSection";
import StickyEventHeader from "@/components/StickyEventHeader";
import { RetroStatusBadge, retroChipClassName, retroPanelClassName } from "@/components/ui/retro";
import { getSeriesLabel } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedEventName, getLocalizedFighterName } from "@/lib/localized-name";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import type { Database } from "@/types/database";

type FighterRow = Database["public"]["Tables"]["fighters"]["Row"];
type FightRow = Database["public"]["Tables"]["fights"]["Row"];
type PredictionRow = Database["public"]["Tables"]["predictions"]["Row"];
type FightWithFighters = FightRow & {
  fighter_a: FighterRow;
  fighter_b: FighterRow;
};
type PredictionVoteRow = Pick<PredictionRow, "fight_id" | "winner_id">;
type FightDisplayState = "upcoming" | "live" | "completed";
type FightEntry = {
  index: number;
  fight: FightWithFighters;
  hasStarted: boolean;
  displayState: FightDisplayState;
  prediction: PredictionRow | null;
  crowdStats: {
    fighter_a_percentage: number;
    fighter_b_percentage: number;
    total_predictions: number;
  } | null;
};

function getStatusTone(status: FightDisplayState | "cancelled") {
  if (status === "completed") return "success";
  if (status === "live" || status === "cancelled") return "danger";
  return "info";
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServer();
  const user = await getUser();
  const { id } = await params;
  const { t, locale } = await getTranslations();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, date, status, mvp_video_url, series_type")
    .eq("id", id)
    .single();

  if (!event) {
    return (
      <div className={retroPanelClassName({ className: "p-6 text-center text-sm text-[var(--bp-muted)]" })}>
        {t("event.notFound")}
      </div>
    );
  }

  const eventStatus = event.status as "upcoming" | "live" | "completed";

  const { data: fights } = await supabase
    .from("fights")
    .select(`
      id, event_id, fighter_a_id, fighter_b_id, start_time, status, winner_id, method, round,
      fighter_a:fighters!fighter_a_id(*),
      fighter_b:fighters!fighter_b_id(*)
    `)
    .eq("event_id", id)
    .order("start_time", { ascending: true });

  const typedFights = (fights ?? []) as FightWithFighters[];
  const fightIds = typedFights.map((fight) => fight.id);
  const earliestStart = typedFights[0]?.start_time ?? null;

  const [{ data: predictions }, { data: statsData }] = await Promise.all([
    user && fightIds.length > 0
      ? supabase.from("predictions").select("*").eq("user_id", user.id).in("fight_id", fightIds)
      : Promise.resolve({ data: [] as PredictionRow[] }),
    fightIds.length > 0
      ? supabase.from("predictions").select("fight_id, winner_id").in("fight_id", fightIds)
      : Promise.resolve({ data: [] as PredictionVoteRow[] }),
  ]);

  const predictionRows = (predictions ?? []) as PredictionRow[];
  const predictionStatsRows = (statsData ?? []) as PredictionVoteRow[];
  const predictionMap = new Map(predictionRows.map((prediction) => [prediction.fight_id, prediction]));

  const statsMap = new Map<string, { fighter_a_percentage: number; fighter_b_percentage: number; total_predictions: number }>();
  for (const fight of typedFights) {
    const rows = predictionStatsRows.filter((prediction) => prediction.fight_id === fight.id);
    const total = rows.length;
    const aCount = rows.filter((prediction) => prediction.winner_id === fight.fighter_a_id).length;
    statsMap.set(fight.id, {
      fighter_a_percentage: total > 0 ? Math.round((aCount / total) * 100) : 0,
      fighter_b_percentage: total > 0 ? Math.round(((total - aCount) / total) * 100) : 0,
      total_predictions: total,
    });
  }

  const eventFighterMap = new Map<string, FighterRow>();
  for (const fight of typedFights) {
    eventFighterMap.set(fight.fighter_a.id, fight.fighter_a);
    eventFighterMap.set(fight.fighter_b.id, fight.fighter_b);
  }

  // eslint-disable-next-line react-hooks/purity -- request-time lock state needs the current server timestamp.
  const nowTimestamp = Date.now();
  const localizedEventName = getLocalizedEventName(event, locale, event.name);
  const fightEntries: FightEntry[] = typedFights.map((fight, index) => {
    const hasStarted = new Date(fight.start_time).getTime() <= nowTimestamp;
    const isCompleted = event.status === "completed" || fight.status === "completed" || fight.status === "cancelled";
    const displayState: FightDisplayState = isCompleted
      ? "completed"
      : event.status === "live" || hasStarted
        ? "live"
        : "upcoming";

    return {
      index: index + 1,
      fight,
      hasStarted,
      displayState,
      prediction: predictionMap.get(fight.id) ?? null,
      crowdStats: statsMap.get(fight.id) ?? null,
    };
  });

  const liveEntries = fightEntries.filter((entry) => entry.displayState === "live");
  const upcomingEntries = fightEntries.filter((entry) => entry.displayState === "upcoming");
  const completedEntries = fightEntries.filter((entry) => entry.displayState === "completed");
  const pickedEntries = fightEntries.filter((entry) => entry.prediction);

  function renderFightSection(sectionId: string, label: string, items: FightEntry[]) {
    if (items.length === 0) return null;

    return (
      <section id={sectionId}>
        <div className="mb-3 flex items-center gap-2">
          <RetroStatusBadge tone={getStatusTone(sectionId as FightDisplayState)}>{label}</RetroStatusBadge>
          <span className="text-xs text-[var(--bp-muted)]">{items.length}</span>
        </div>
        <div className="space-y-2">
          {items.map((entry) => (
            <FightCard
              key={entry.fight.id}
              index={entry.index}
              variant="option-2"
              fight={entry.fight}
              eventStatus={eventStatus}
              hasStarted={entry.hasStarted}
              prediction={entry.prediction}
              crowdStats={entry.crowdStats}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="relative space-y-4 pb-24 md:pb-0">
      <StickyEventHeader
        eventName={localizedEventName}
        eventStatus={eventStatus}
        countdownTargetTime={eventStatus === "upcoming" ? earliestStart : null}
        watchElementId="event-page-header"
      />

      {/* Event Header */}
      <section id="event-page-header" className={retroPanelClassName({ className: "p-4 sm:p-5" })}>
        <div className="flex items-center gap-2">
          <RetroStatusBadge tone={getStatusTone(event.status as FightDisplayState)}>
            {t(`status.${event.status}`)}
          </RetroStatusBadge>
          <span className={retroChipClassName({ tone: "neutral" })}>{getSeriesLabel(event.series_type, t)}</span>
        </div>

        <h1 className="mt-3 text-xl font-bold tracking-[-0.02em] text-[var(--bp-ink)] sm:text-2xl">
          {localizedEventName}
        </h1>
        <p className="mt-1 text-sm text-[var(--bp-muted)]">{event.date}</p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--bp-muted)]">
          <span>{fightEntries.length} {t("event.totalFights")}</span>
          <span>·</span>
          <span>{pickedEntries.length} {t("prediction.yourPick")}</span>
        </div>

        {/* Timer */}
        {event.status === "upcoming" && earliestStart ? (
          <div className="mt-4">
            <FlipTimer targetTime={earliestStart} />
          </div>
        ) : null}

        {/* Quick Nav */}
        <div className="mt-4 flex gap-2">
          {liveEntries.length > 0 ? (
            <a href="#live" className={retroChipClassName()}>
              {t("status.live")} {liveEntries.length}
            </a>
          ) : null}
          {upcomingEntries.length > 0 ? (
            <a href="#upcoming" className={retroChipClassName({ tone: "neutral" })}>
              {t("status.upcoming")} {upcomingEntries.length}
            </a>
          ) : null}
          {completedEntries.length > 0 ? (
            <a href="#completed" className={retroChipClassName({ tone: "neutral" })}>
              {t("status.completed")} {completedEntries.length}
            </a>
          ) : null}
        </div>
      </section>

      {/* Fight Sections */}
      <div className="space-y-5">
        {renderFightSection("live", t("status.live"), liveEntries)}
        {renderFightSection("upcoming", t("status.upcoming"), upcomingEntries)}
        {renderFightSection("completed", t("status.completed"), completedEntries)}
      </div>

      {/* MVP Video */}
      {event.status === "completed" && event.mvp_video_url ? (
        <section className={retroPanelClassName({ className: "overflow-hidden p-0" })}>
          <div className="border-b border-[var(--bp-line)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--bp-accent)]">{t("event.mvpHighlight")}</p>
          </div>
          <div className="aspect-video w-full bg-black">
            <iframe
              src={event.mvp_video_url}
              title={t("event.mvpHighlightVideo")}
              className="h-full w-full"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>
      ) : null}

      {/* MVP Vote */}
      {event.status === "completed" ? (
        <MvpVoteSection
          eventId={event.id}
          eventDate={event.date}
          fighters={Array.from(eventFighterMap.values())}
        />
      ) : null}
    </div>
  );
}
