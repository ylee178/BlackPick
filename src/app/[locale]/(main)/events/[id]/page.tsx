import AllPredictedToast from "@/components/AllPredictedToast";
import EventDateLine from "@/components/EventDateLine";
import EventShareCta from "@/components/EventShareCta";
import { buildSharePath } from "@/lib/share-url";
import FightCard from "@/components/FightCard";
import FightComments from "@/components/FightComments";
import FlipTimer from "@/components/FlipTimer";
import {
  deriveEventUiFacts,
  derivePostLockTimerState,
} from "@/lib/event-ui-state";
import LockTransitionWatcher from "@/components/LockTransitionWatcher";
import MvpVoteSection from "@/components/MvpVoteSection";
import StickyEventHeader from "@/components/StickyEventHeader";
import { RetroStatusBadge, retroChipClassName, retroPanelClassName } from "@/components/ui/retro";
import { fetchBcOfficialEventCard } from "@/lib/bc-official";
import {
  resolveScoreCardsByDbFightId,
  type ScoreCardResolution,
} from "@/lib/bc-scorecards";
import { fetchBcEventDataFull } from "@/lib/bc-predictions";
import { getSeriesLabel } from "@/lib/constants";
import { getEarliestFightStart, sortFightsByOfficialCardOrder } from "@/lib/fight-alignment";
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
  bcPrediction: { fighterA_pct: number; fighterB_pct: number } | null;
  bcWeightClass: string | null;
  bcIsMainEvent: boolean;
  bcFighterADivision: { weightClass: string; rank: number | null } | null;
  bcFighterBDivision: { weightClass: string; rank: number | null } | null;
  scoreCard: import("@/lib/bc-official").BcScoreCard | null;
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

  let userInitial = "?";
  let userRingName: string | null = null;
  let userCurrentStreakFromDb: number | null = null;
  if (user) {
    const { data: dbUser } = await supabase
      .from("users")
      .select("ring_name, current_streak")
      .eq("id", user.id)
      .single();
    userRingName = dbUser?.ring_name ?? null;
    userInitial = userRingName?.charAt(0) || "?";
    userCurrentStreakFromDb = dbUser?.current_streak ?? null;
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, name, date, status, completed_at, mvp_video_url, series_type, source_event_id")
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
      id, event_id, fighter_a_id, fighter_b_id, start_time, status, winner_id, method, round, is_title_fight, is_main_card,
      fighter_a:fighters!fighter_a_id(*),
      fighter_b:fighters!fighter_b_id(*)
    `)
    .eq("event_id", id)
    .order("start_time", { ascending: false });

  const rawFights = (fights ?? []) as FightWithFighters[];
  const bcResult = await fetchBcEventDataFull(event.name, event.source_event_id);
  const officialCard =
    bcResult.sourceEventId ? await fetchBcOfficialEventCard(bcResult.sourceEventId).catch(() => []) : [];
  const typedFights = sortFightsByOfficialCardOrder(rawFights, officialCard);
  const fightIds = typedFights.map((fight) => fight.id);
  const earliestStart = getEarliestFightStart(typedFights);

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

  const bcRawData = bcResult.fights;
  // Both BC site and our DB now order main event first (DESC by start_time).
  // Direct index alignment — trim BC data to match DB fight count.
  const bcFightData = bcRawData.slice(0, typedFights.length);

  // Scorecards keyed by DB fight id (spec v3 §L2) — positional index
  // would silently shift cards onto adjacent fights when BC returns
  // a TBA placeholder. `.catch` collapses a resolver error into an
  // empty Map so scorecard absence never blocks the page render.
  const scoreCardResolutions = await resolveScoreCardsByDbFightId(
    typedFights,
    officialCard,
  ).catch(() => new Map<string, ScoreCardResolution>());

  // eslint-disable-next-line react-hooks/purity -- request-time lock state needs the current server timestamp.
  const nowTimestamp = Date.now();

  // Single source of truth for event display state. See page.tsx for
  // the rationale. FlipTimer below derives its burned-out message
  // from the same facts object.
  const eventFacts = deriveEventUiFacts(event, typedFights, nowTimestamp);
  const postLockState = derivePostLockTimerState(eventFacts);
  const flipTimerMessageKey: "countdown.eventInProgress" | "countdown.eventStartingSoon" =
    postLockState.kind === "burnedOut" && postLockState.messageKey === "eventStartingSoon"
      ? "countdown.eventStartingSoon"
      : "countdown.eventInProgress";

  const localizedEventName = getLocalizedEventName(event, locale, event.name);
  const fightEntries: FightEntry[] = typedFights.map((fight, index) => {
    const hasStarted = new Date(fight.start_time).getTime() <= nowTimestamp;
    const isCompleted = event.status === "completed" || fight.status === "completed" || fight.status === "cancelled";
    const displayState: FightDisplayState = isCompleted
      ? "completed"
      : event.status === "live" || hasStarted
        ? "live"
        : "upcoming";
    const scResolution = scoreCardResolutions.get(fight.id);
    const scoreCard =
      scResolution?.kind === "scored" ? scResolution.scoreCard : null;

    return {
      index: index + 1,
      fight,
      hasStarted,
      displayState,
      prediction: predictionMap.get(fight.id) ?? null,
      crowdStats: statsMap.get(fight.id) ?? null,
      bcPrediction: bcFightData[index]
        ? { fighterA_pct: bcFightData[index].fighterA_pct, fighterB_pct: bcFightData[index].fighterB_pct }
        : null,
      bcWeightClass: bcFightData[index]?.weightClass ?? null,
      bcIsMainEvent: bcFightData[index]?.isMainEvent ?? false,
      bcFighterADivision: bcFightData[index]?.fighterA_division ?? null,
      bcFighterBDivision: bcFightData[index]?.fighterB_division ?? null,
      scoreCard,
    };
  });

  const liveEntries = fightEntries.filter((entry) => entry.displayState === "live");
  const upcomingEntries = fightEntries.filter((entry) => entry.displayState === "upcoming");
  const completedEntries = fightEntries.filter((entry) => entry.displayState === "completed");
  const pickedEntries = fightEntries.filter((entry) => entry.prediction);

  // "All predicted" toast inputs: only upcoming (pickable) fights count
  // toward the total, so cancelled / no-contest / already-started fights
  // are naturally excluded from both the numerator and the denominator.
  const predictableTotal = upcomingEntries.length;
  const predictedCount = upcomingEntries.filter((entry) => entry.prediction).length;

  // Share-CTA inputs — per-event W-L derived from completed fights
  // where the user's pick resolved one way or the other. `is_winner_correct`
  // is boolean | null on the predictions table; we only count entries
  // where it's explicitly true/false (null = not yet scored).
  const winsThisCard = pickedEntries.filter(
    (entry) => entry.prediction?.is_winner_correct === true,
  ).length;
  const lossesThisCard = pickedEntries.filter(
    (entry) => entry.prediction?.is_winner_correct === false,
  ).length;
  const userCurrentStreak: number | null = userCurrentStreakFromDb;

  // LockTransitionWatcher feed: timestamps where fights transition from
  // pickable to locked. When `useClockTick` crosses any of these, the
  // watcher fires `router.refresh()` so the server-rendered fight card
  // states (`hasStarted`, `displayState`) flip to the correct values
  // without waiting for a manual page reload. We only include upcoming
  // entries because live/completed are already past their transition.
  //
  // `Number.isFinite` (not `!isNaN`) and an explicit null check — a
  // missing `start_time` makes `new Date(null).getTime()` return `0`,
  // which passes `!isNaN(0)` as true and would feed `0` into the
  // watcher, causing a permanent 10s refresh loop on any malformed
  // row. Flagged by the 2026-04-12 gpt-review.sh review.
  const lockTimestamps = upcomingEntries.flatMap((entry) => {
    const raw = entry.fight.start_time;
    if (!raw) return [];
    const ts = Date.parse(raw);
    return Number.isFinite(ts) ? [ts] : [];
  });

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
              isMainEvent={entry.bcIsMainEvent || entry.index === 1}
              fight={entry.fight}
              eventStatus={eventStatus}
              hasStarted={entry.hasStarted}
              prediction={entry.prediction}
              crowdStats={entry.crowdStats}
              bcPrediction={entry.bcPrediction}
              bcWeightClass={entry.bcWeightClass}
              bcFighterADivision={entry.bcFighterADivision}
              bcFighterBDivision={entry.bcFighterBDivision}
              seriesLabel={event?.series_type === "black_cup" ? getSeriesLabel(event.series_type, t) : null}
              isAuthenticated={!!user}
              scoreCard={entry.scoreCard}
            />
          ))}
        </div>
      </section>
    );
  }

  // Use BC poster URL (auto-detected from BC site)
  const posterUrl = bcResult.posterUrl;

  return (
    <div className="relative flex flex-col gap-10 pb-24 md:pb-0">
      <AllPredictedToast
        // Key the component by (user, event) so any identity change
        // remounts it and resets the "already fired this mount" ref —
        // protects against a stale fire lock leaking across navigations
        // or auth state changes within the same client tree.
        key={`${user?.id ?? "anon"}:${id}`}
        userId={user?.id ?? null}
        eventId={id}
        predictableTotal={predictableTotal}
        predictedCount={predictedCount}
      />
      <LockTransitionWatcher lockTimestamps={lockTimestamps} />
      <StickyEventHeader
        eventName={localizedEventName}
        eventStatus={eventStatus}
        // Pass the earliest start time through upcoming AND live so
        // StickyEventHeader's own FlipTimer (if any) matches the hero
        // FlipTimer — both show countdown pre-lock and "locked" card
        // post-lock. Completed events hide the slot entirely.
        countdownTargetTime={eventStatus !== "completed" ? earliestStart : null}
        watchElementId="event-page-header"
      />

      {/* Poster Background Hero */}
      {posterUrl ? (
        <div className="relative -mx-4 -mt-10 overflow-hidden sm:-mx-6">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${posterUrl})` }}
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(0,0,0,0.4)] via-[rgba(0,0,0,0.6)] to-[var(--bp-bg)]" />

          {/* Content on top of poster */}
          <div className="relative px-4 pb-8 pt-14 sm:px-6">
            <section id="event-page-header" className="event-glass-card rounded-[16px] p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <RetroStatusBadge tone={getStatusTone(event.status as FightDisplayState)}>
                  {t(`status.${event.status}`)}
                </RetroStatusBadge>
                <span className={retroChipClassName({ tone: "neutral" })}>{getSeriesLabel(event.series_type, t)}</span>
              </div>

              <h1 className="mt-3 text-xl font-bold tracking-[-0.02em] text-white sm:text-2xl">
                {localizedEventName}
              </h1>
              <EventDateLine
                eventDate={event.date}
                startTime={earliestStart}
                className="mt-1.5 text-[rgba(255,255,255,0.7)]"
              />

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span><span className="font-semibold text-white">{fightEntries.length}</span> <span className="text-[rgba(255,255,255,0.5)]">{t("event.totalFights")}</span></span>
                <span className="text-[rgba(255,255,255,0.3)]">·</span>
                <span><span className="font-semibold text-white">{pickedEntries.length}</span> <span className="text-[rgba(255,255,255,0.5)]">{t("prediction.yourPick")}</span></span>
              </div>

              {/* Lock indicator: FlipTimer stays mounted through the
                  upcoming → live transition (condition widened from
                  `event.status === "upcoming"` to `!== "completed"`)
                  because FlipTimer's internal `countdown.locked` card
                  already covers the post-`targetTime` state.
                  LockTransitionWatcher above pokes the server to
                  re-render with fresh `hasStarted` so the fight list
                  flips to static mode at the same moment.
                  When `earliestStart` is missing entirely, we render
                  null instead of a fake "locked" card — missing data
                  is not the same as locked, and the previous pass
                  regressed this by showing locked for bad rows. */}
              {event.status !== "completed" && earliestStart ? (
                <div className="mt-4">
                  <FlipTimer
                    targetTime={earliestStart}
                    postLockMessageKey={flipTimerMessageKey}
                  />
                </div>
              ) : null}

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

              {/* Share CTA lives INSIDE the hero card so the action
                  stays next to the event context. State-driven copy:
                  no ring name / no picks → disabled hint button;
                  picks saved → "Share your card" / "N/N locked in";
                  post-result → W-L record. Mobile sticky bottom bar
                  is rendered from inside this component. */}
              {user ? (
                <EventShareCta
                  ringName={userRingName}
                  eventName={localizedEventName}
                  hasAnyPicks={pickedEntries.length > 0}
                  upcomingPickedCount={predictedCount}
                  upcomingTotal={predictableTotal}
                  winsThisCard={winsThisCard}
                  lossesThisCard={lossesThisCard}
                  userCurrentStreak={userCurrentStreak}
                  profileHref="/profile"
                  shareUrl={userRingName ? buildSharePath(userRingName, event.id) : null}
                />
              ) : null}
            </section>
          </div>
        </div>
      ) : (
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
          <EventDateLine
            eventDate={event.date}
            startTime={earliestStart}
            className="mt-1.5"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span><span className="font-semibold text-[var(--bp-ink)]">{fightEntries.length}</span> <span className="text-[var(--bp-muted)]">{t("event.totalFights")}</span></span>
            <span className="text-[var(--bp-muted)] opacity-50">·</span>
            <span><span className="font-semibold text-[var(--bp-ink)]">{pickedEntries.length}</span> <span className="text-[var(--bp-muted)]">{t("prediction.yourPick")}</span></span>
          </div>

          {/* Same lock-indicator rule as the poster branch above —
              see that comment for rationale. */}
          {event.status !== "completed" && earliestStart ? (
            <div className="mt-4">
              <FlipTimer targetTime={earliestStart} />
            </div>
          ) : null}

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

          {/* Same Share CTA as the poster branch above. Anonymous
              viewers (!user) don't see the CTA at all. */}
          {user ? (
            <EventShareCta
              ringName={userRingName}
              eventName={localizedEventName}
              hasAnyPicks={pickedEntries.length > 0}
              upcomingPickedCount={predictedCount}
              upcomingTotal={predictableTotal}
              winsThisCard={winsThisCard}
              lossesThisCard={lossesThisCard}
              userCurrentStreak={userCurrentStreak}
              profileHref="/profile"
              shareUrl={userRingName ? buildSharePath(userRingName, event.id) : null}
            />
          ) : null}
        </section>
      )}

      {/* Fight Sections */}
      <div className="flex flex-col gap-6">
        {renderFightSection("live", t("status.live"), liveEntries)}
        {renderFightSection("upcoming", t("status.upcoming"), upcomingEntries)}
        {renderFightSection("completed", t("status.completed"), completedEntries)}
      </div>

      {/* Fight Discussion */}
      <div className="flex flex-col gap-4">
        {fightEntries.map((entry) => {
          const aName = getLocalizedFighterName(entry.fight.fighter_a, locale, entry.fight.fighter_a.name);
          const bName = getLocalizedFighterName(entry.fight.fighter_b, locale, entry.fight.fighter_b.name);
          return (
            <FightComments
              key={`comments-${entry.fight.id}`}
              fightId={entry.fight.id}
              fightLabel={`${aName} vs ${bName}`}
              currentUserId={user?.id ?? null}
              currentUserInitial={userInitial}
              mode="preview"
              viewAllHref={`/events/${event.id}/fights/${entry.fight.id}`}
            />
          );
        })}
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
          eventCompletedAt={event.completed_at}
          fighters={Array.from(eventFighterMap.values())}
        />
      ) : null}
    </div>
  );
}
