import { Link } from "@/i18n/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";
import { countryCodeToFlag } from "@/lib/flags";
import { getLocalizedEventName } from "@/lib/localized-name";
import FightCard from "@/components/FightCard";
import EventDateLine from "@/components/EventDateLine";
import FlipTimer from "@/components/FlipTimer";
import {
  deriveEventUiFacts,
  derivePostLockTimerState,
} from "@/lib/event-ui-state";
import { filterUserVisibleEvents } from "@/lib/event-visibility";
import { Ticket, Play, Trophy } from "lucide-react";
import LeagueRankingCard from "@/components/LeagueRankingCard";
import AnonFirstPickCta from "@/components/AnonFirstPickCta";
import AllPredictedToast from "@/components/AllPredictedToast";
import HomeShareBar from "@/components/HomeShareBar";
import { buildSharePath } from "@/lib/share-url";
import { fetchBcOfficialEventCard, type BcOfficialFight } from "@/lib/bc-official";
import {
  resolveScoreCardsByDbFightId,
  type ScoreCardResolution,
} from "@/lib/bc-scorecards";
import { fetchBcEventDataFull, type BcFightData } from "@/lib/bc-predictions";
import { fetchBcTicketInfo } from "@/lib/bc-ticket";
import { getEarliestFightStart, sortFightsByOfficialCardOrder } from "@/lib/fight-alignment";
import StickyEventHeader from "@/components/StickyEventHeader";
import {
  RetroLabel,
  retroButtonClassName,
  retroPanelClassName,
} from "@/components/ui/retro";
import { RankingRowCompact } from "@/components/ui/ranking";
import type { Database } from "@/types/database";

// 2026-04-14 Sean bug fix: was `revalidate = 60` which cached the
// server-rendered HTML for 1 minute. DevPanel state flips hit the
// DB but `router.refresh()` didn't bust the data cache, so Sean
// was seeing stale "끝난 경기" state after clicking 업커밍. Force
// dynamic rendering so every request re-fetches. Trade-off: DB
// hit per request (acceptable for MVP scale; revisit post-launch).
export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  name: string;
  date: string;
  status: "upcoming" | "live" | "completed";
  series_type: "black_cup" | "numbering" | "rise" | "other";
  source_event_id: string | null;
};

type FighterRow = Database["public"]["Tables"]["fighters"]["Row"];
type FightRow = Database["public"]["Tables"]["fights"]["Row"];
type PredictionRow = Database["public"]["Tables"]["predictions"]["Row"];
type FightWithFighters = FightRow & { fighter_a: FighterRow; fighter_b: FighterRow };
type PredictionVoteRow = Pick<PredictionRow, "fight_id" | "winner_id">;

type RankingUser = {
  id: string;
  ring_name: string | null;
  score: number | null;
  wins: number | null;
  losses: number | null;
  current_streak?: number | null;
  best_streak?: number | null;
};

function getStatusTone(status: string) {
  if (status === "live") return "danger" as const;
  if (status === "completed") return "success" as const;
  return "info" as const;
}

type HomePageProps = {
  searchParams?: Promise<{ dev_event?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = await createSupabaseServer();
  const { t, locale } = await getTranslations();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Dev-only event override: DevPanel's event picker navigates to
  // `/?dev_event={id}` so Sean sees the selected event immediately
  // on the home page instead of whatever the featured-logic resolves
  // to. Respected only when NODE_ENV === "development" — production
  // ignores the param entirely.
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const devEventParam = resolvedSearchParams?.dev_event;
  const devEventId =
    process.env.NODE_ENV === "development" && typeof devEventParam === "string"
      ? devEventParam
      : null;

  // Stage 1: Fetch events, top users, and series types in parallel
  const [{ data: events }, { data: topUsers }, { data: seriesData }, ticketInfo] = await Promise.all([
    supabase.from("events").select("id, name, date, status, series_type, source_event_id").order("date", { ascending: true }),
    supabase.from("users").select("id, ring_name, score, wins, losses, current_streak, best_streak").order("score", { ascending: false }).limit(10),
    supabase.from("events").select("series_type").order("series_type"),
    fetchBcTicketInfo(),
  ]);

  const typedEvents = (events ?? []) as EventRow[];
  // Discovery surfaces (featured event + active/completed lists) hide
  // pre-Exodus seed data. `typedEvents` stays unfiltered so the
  // `?dev_event={id}` override can still resolve older rows in dev
  // (useful for regression testing against legacy seeds). See
  // `src/lib/event-visibility.ts` for the scope contract.
  const visibleEvents = filterUserVisibleEvents(typedEvents);
  const activeEvents = visibleEvents.filter((e) => e.status === "live" || e.status === "upcoming");
  const completedEvents = visibleEvents.filter((e) => e.status === "completed").reverse();
  // Dev event override takes precedence when present and the event
  // actually exists in DB. Deliberately reads from the unfiltered
  // `typedEvents` so dev overrides can target pre-Exodus seeds.
  const devOverride = devEventId
    ? typedEvents.find((e) => e.id === devEventId) ?? null
    : null;
  const featured = devOverride ?? activeEvents[0] ?? completedEvents[0] ?? null;
  const allTimeUsers = (topUsers ?? []) as RankingUser[];
  const seriesTypes = [...new Set((seriesData ?? []).map((e: { series_type: string }) => e.series_type))];

  // Current user's streak + ring_name — used by StickyEventHeader's
  // post-lock streak indicator and the fight-list share button. The
  // layout also fetches this (for AccountDropdown), but RSC children
  // can't read the layout's server state — one extra query is the
  // simplest correct path.
  const { data: selfUser } = authUser
    ? await supabase
        .from("users")
        .select("ring_name, current_streak")
        .eq("id", authUser.id)
        .maybeSingle()
    : { data: null };
  const selfCurrentStreak: number | null = selfUser?.current_streak ?? null;
  const selfRingName: string | null = selfUser?.ring_name ?? null;

  const p4pUsers = [...allTimeUsers]
    .filter((u) => ((u.wins ?? 0) + (u.losses ?? 0)) >= 5)
    .sort((a, b) => {
      const rateA = (a.wins ?? 0) / Math.max(1, (a.wins ?? 0) + (a.losses ?? 0));
      const rateB = (b.wins ?? 0) / Math.max(1, (b.wins ?? 0) + (b.losses ?? 0));
      return rateB - rateA;
    })
    .slice(0, 5);

  const streakUsers = [...allTimeUsers]
    .filter((u) => (u.current_streak ?? 0) > 0)
    .sort((a, b) => (b.current_streak ?? 0) - (a.current_streak ?? 0))
    .slice(0, 5);

  let fights: FightWithFighters[] = [];
  let predictionMap = new Map<string, PredictionRow>();
  const statsMap = new Map<string, { fighter_a_percentage: number; fighter_b_percentage: number; total_predictions: number }>();
  let earliestStart: string | null = null;
  const initialLeagueUsers: { id: string; ring_name: string | null; score: number | null }[] = [];
  let bcFightData: BcFightData[] = [];
  let posterUrl: string | null = null;
  let scoreCardResolutions = new Map<string, ScoreCardResolution>();

  if (featured) {
    // Stage 2: Fetch fights + BC data in parallel (BC is external & slow)
    const [{ data: fightData }, bcFull] = await Promise.all([
      supabase
        .from("fights")
        .select(`
          id, event_id, fighter_a_id, fighter_b_id, start_time, status, winner_id, method, round, is_cup_match, is_title_fight, is_main_card,
          fighter_a:fighters!fighter_a_id(*),
          fighter_b:fighters!fighter_b_id(*)
        `)
        .eq("event_id", featured.id)
        .order("start_time", { ascending: false }),
      fetchBcEventDataFull(featured.name, featured.source_event_id).catch(() => ({
        fights: [] as BcFightData[],
        posterUrl: null,
        sourceEventId: null,
      })),
    ]);

    const officialCard: BcOfficialFight[] =
      bcFull.sourceEventId ? await fetchBcOfficialEventCard(bcFull.sourceEventId).catch(() => []) : [];
    fights = sortFightsByOfficialCardOrder((fightData ?? []) as FightWithFighters[], officialCard);
    earliestStart = getEarliestFightStart(fights);
    bcFightData = bcFull.fights.slice(0, fights.length);
    posterUrl = bcFull.posterUrl;

    // Resolve BC scorecards per DB fight (keyed by DB fight id, not
    // positional index — spec v3 §L2). Non-decision / no-method /
    // no-match fights land as suppressed variants and surface nothing.
    // Failed resolution (defensive — `resolveScoreCardsByDbFightId`
    // swallows fetch errors internally) falls back to an empty Map so
    // page rendering never depends on BC reachability.
    scoreCardResolutions = await resolveScoreCardsByDbFightId(
      fights,
      officialCard,
    ).catch(() => new Map<string, ScoreCardResolution>());

    // Stage 3: Predictions + stats in parallel
    const fightIds = fights.map((f) => f.id);
    const [{ data: preds }, { data: statsRawData }] = await Promise.all([
      authUser && fightIds.length > 0
        ? supabase.from("predictions").select("*").eq("user_id", authUser.id).in("fight_id", fightIds)
        : Promise.resolve({ data: [] as PredictionRow[] }),
      fightIds.length > 0
        ? supabase.from("predictions").select("fight_id, winner_id").in("fight_id", fightIds)
        : Promise.resolve({ data: [] as PredictionVoteRow[] }),
    ]);

    predictionMap = new Map((preds ?? []).map((p: PredictionRow) => [p.fight_id, p]));

    for (const fight of fights) {
      const rows = ((statsRawData ?? []) as PredictionVoteRow[]).filter((p) => p.fight_id === fight.id);
      const total = rows.length;
      const aCount = rows.filter((p) => p.winner_id === fight.fighter_a_id).length;
      statsMap.set(fight.id, {
        fighter_a_percentage: total > 0 ? Math.round((aCount / total) * 100) : 0,
        fighter_b_percentage: total > 0 ? Math.round(((total - aCount) / total) * 100) : 0,
        total_predictions: total,
      });
    }
  }

  const eventStatus = featured?.status as "upcoming" | "live" | "completed" | undefined;
  const nowTimestamp = new Date().getTime();
  const pickedCount = fights.filter((f) => predictionMap.has(f.id)).length;

  // Single source of truth for event display state. Consumers below
  // (FlipTimer messageKey, StickyEventHeader slot) derive from this
  // rather than re-reconciling event.status + fight.start_time +
  // fight.status independently. Prevents the "four contradictory UI
  // signals" bug (2026-04-17 Sean screenshot).
  const eventFacts = featured
    ? deriveEventUiFacts(featured, fights, nowTimestamp)
    : null;
  const postLockState = eventFacts
    ? derivePostLockTimerState(eventFacts)
    : null;
  const flipTimerMessageKey: "countdown.eventInProgress" | "countdown.eventStartingSoon" =
    postLockState?.kind === "burnedOut" && postLockState.messageKey === "eventStartingSoon"
      ? "countdown.eventStartingSoon"
      : "countdown.eventInProgress";

  // AllPredictedToast props — counts only upcoming (pickable) fights
  // on the featured event. Matches the displayState derivation on the
  // event detail page so the transition-detection logic behaves
  // consistently whether Sean is on / or /events/[id]. 2026-04-14
  // fix: previously mounted only on /events/[id] (the orphan page),
  // so the toast never fired when picks were saved from home.
  const upcomingPredictableFights = fights.filter((f) => {
    const hasStarted = new Date(f.start_time).getTime() <= nowTimestamp;
    const isCompleted =
      eventStatus === "completed" || f.status === "completed" || f.status === "cancelled";
    const isLive = !isCompleted && (eventStatus === "live" || hasStarted);
    return !isCompleted && !isLive;
  });
  const predictableTotal = upcomingPredictableFights.length;
  const predictedCount = upcomingPredictableFights.filter((f) => predictionMap.has(f.id)).length;

  // Black Cup completed: compute country scores from cup matches
  const isBlackCup = featured?.series_type === "black_cup";
  let cupScores: { flagA: string; flagB: string; nameA: string; nameB: string; winsA: number; winsB: number } | null = null;

  const countryNames: Record<string, string> = {
    KR: "Korea", US: "USA", JP: "Japan", CN: "China", MN: "Mongolia",
    BR: "Brazil", TH: "Thailand", RU: "Russia", AF: "Afghanistan",
    PH: "Philippines", UZ: "Uzbekistan", KG: "Kyrgyzstan",
  };

  if (isBlackCup && eventStatus === "completed") {
    const countryMap = new Map<string, number>();
    for (const fight of fights) {
      if (fight.status !== "completed" || !fight.winner_id) continue;
      if (!(fight as Record<string, unknown>).is_cup_match) continue;
      const winner = fight.winner_id === fight.fighter_a_id ? fight.fighter_a : fight.fighter_b;
      const nat = (winner as Record<string, string | null> | null)?.nationality;
      if (nat) countryMap.set(nat, (countryMap.get(nat) ?? 0) + 1);
    }
    const sorted = [...countryMap.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length >= 2) {
      cupScores = {
        flagA: countryCodeToFlag(sorted[0][0]),
        flagB: countryCodeToFlag(sorted[1][0]),
        nameA: countryNames[sorted[0][0]] ?? sorted[0][0],
        nameB: countryNames[sorted[1][0]] ?? sorted[1][0],
        winsA: sorted[0][1],
        winsB: sorted[1][1],
      };
    }
  }

  const localizedEventName = featured ? getLocalizedEventName(featured, locale, featured.name) : "";

  const featuredHref = featured ? `/events/${featured.id}` : "/";

  return (
    <div className="flex flex-col gap-10">
      {/* 2026-04-14 fix: AllPredictedToast previously mounted only on
          the orphan /events/[id] page, so saving all picks from home
          never triggered it. Now also mounted here keyed on user+event
          so transition detection + localStorage lock both work when
          Sean uses the home page as his primary surface. */}
      {featured && authUser ? (
        <AllPredictedToast
          key={`home:${authUser.id}:${featured.id}`}
          userId={authUser.id}
          eventId={featured.id}
          predictableTotal={predictableTotal}
          predictedCount={predictedCount}
        />
      ) : null}

      {/* Sticky sub-header for scrolling */}
      {featured ? (
        <StickyEventHeader
          eventName={localizedEventName}
          eventStatus={eventStatus ?? "upcoming"}
          countdownTargetTime={eventStatus === "upcoming" ? earliestStart : null}
          watchElementId={eventStatus === "upcoming" && earliestStart ? "home-timer" : "home-hero"}
          currentStreak={selfCurrentStreak}
        />
      ) : null}

      {/* ═══ HERO: Event Overview ═══ */}
      <section id="home-hero" className="relative overflow-hidden rounded-[20px] border border-[var(--bp-line)] bg-[var(--bp-card)]">
        {/* Poster background */}
        {posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
              style={{ objectPosition: "center 20%" }}
            />
            <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, var(--bp-card) 0%, rgba(13,13,13,0.7) 50%, rgba(13,13,13,0.4) 100%)" }} />
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[rgba(229,169,68,0.06)] blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[rgba(229,169,68,0.04)] blur-[80px]" />
          </>
        )}

        <div className="relative p-4 sm:p-6 lg:p-8">
          {featured ? (
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Event info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <RetroLabel size="sm" tone={getStatusTone(featured.status)}>
                    {t(`status.${featured.status}`)}
                  </RetroLabel>
                  <RetroLabel size="sm" tone="neutral">{getSeriesLabel(featured.series_type, t)}</RetroLabel>
                </div>

                <h1 className="mt-4 text-2xl font-extrabold leading-[1.1] tracking-[-0.03em] text-[var(--bp-ink)] sm:text-3xl lg:text-4xl">
                  {getLocalizedEventName(featured, locale, featured.name)}
                </h1>

                <EventDateLine
                  eventDate={featured.date}
                  startTime={earliestStart}
                  className="mt-2"
                />

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-[var(--bp-muted)]"><span className="font-semibold text-[var(--bp-ink)]">{fights.length}</span> {t("event.totalFights")}</span>
                  {authUser ? (
                    <>
                      <span className="text-[var(--bp-muted)]">·</span>
                      <span className="text-[var(--bp-muted)]"><span className="font-semibold text-[var(--bp-ink)]">{pickedCount}/{fights.length}</span> {t("event.picked")}</span>
                    </>
                  ) : null}
                </div>

                {eventStatus === "upcoming" || eventStatus === "live" ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {eventStatus === "upcoming" && ticketInfo.soldOut ? (
                      <button
                        type="button"
                        disabled
                        className={retroButtonClassName({
                          variant: "secondary",
                          size: "sm",
                          className: "cursor-not-allowed opacity-60",
                        })}
                        title={ticketInfo.title ?? undefined}
                      >
                        <Ticket className="h-4 w-4" strokeWidth={1.5} />
                        {t("home.soldOut")}
                      </button>
                    ) : eventStatus === "upcoming" && ticketInfo.url ? (
                      <a
                        href={ticketInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={retroButtonClassName({ variant: "primary", size: "sm" })}
                        title={ticketInfo.title ?? undefined}
                      >
                        <Ticket className="h-4 w-4" strokeWidth={1.5} />
                        {t("home.buyTickets")}
                      </a>
                    ) : null}
                    {eventStatus === "live" ? (
                      // ShimmerButton wrapper — Sean 2026-04-14
                      // reference: magicui ShimmerButton. Button
                      // keeps its original secondary style; CSS
                      // pseudos on the wrapper render the rotating
                      // shimmer ring.
                      <span className="shimmer-wrap">
                        <a
                          href="https://www.youtube.com/@blackcombat"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={retroButtonClassName({
                            variant: "secondary",
                            size: "sm",
                          })}
                        >
                          <Play className="h-4 w-4" strokeWidth={1.5} />
                          {t("home.watchLive")}
                        </a>
                      </span>
                    ) : (
                      <a
                        href="https://www.youtube.com/@blackcombat"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={retroButtonClassName({
                          variant: "secondary",
                          size: "sm",
                        })}
                      >
                        <Play className="h-4 w-4" strokeWidth={1.5} />
                        {t("home.watchLive")}
                      </a>
                    )}
                  </div>
                ) : null}

              </div>

              {/* Right: Timer or Cup Scoreboard */}
              {(eventStatus === "upcoming" || eventStatus === "live") && earliestStart ? (
                <div id="home-timer" className="shrink-0">
                  {/* FlipTimer's internal tl.total <= 0 branch renders
                      the burned-out message + Lock state when
                      start_time is past. The message key is derived
                      from `derivePostLockTimerState(eventFacts)` so an
                      UPCOMING event with stale start_time shows the
                      softer "Starting Soon" copy rather than
                      contradicting its own UPCOMING badge. */}
                  <FlipTimer
                    targetTime={earliestStart}
                    postLockMessageKey={flipTimerMessageKey}
                  />
                </div>
              ) : cupScores ? (
                <div className="shrink-0 rounded-[12px] bg-[#060606] px-6 py-5">
                  <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--bp-muted)]">
                    <Trophy className="h-3.5 w-3.5 text-[var(--bp-accent)]" strokeWidth={2} />
                    {t("ranking.score")}
                  </p>
                  <div className="flex items-center gap-4">
                    {/* Winner */}
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-4xl leading-none">{cupScores.flagA}</span>
                      <span className="text-xs font-bold text-[var(--bp-ink)]">{cupScores.nameA}</span>
                    </div>
                    {/* Score — LCD style like timer */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="lcd-digit"><span>{cupScores.winsA}</span></div>
                        <span className="lcd-colon">:</span>
                        <div className="lcd-digit"><span>{cupScores.winsB}</span></div>
                      </div>
                      <RetroLabel size="sm" tone="accent">{cupScores.flagA} {t("event.win")}</RetroLabel>
                    </div>
                    {/* Loser */}
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-4xl leading-none">{cupScores.flagB}</span>
                      <span className="text-xs font-bold text-[var(--bp-ink)]">{cupScores.nameB}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-[var(--bp-ink)] sm:text-3xl">
                {t("home.heroTitle")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--bp-muted)]">{t("home.heroDescription")}</p>
              <div className="mt-4 flex gap-2">
                <Link href="/ranking" className={retroButtonClassName({ variant: "primary", size: "lg" })}>
                  {t("nav.ranking")}
                </Link>
                <Link href="/fighters" className={retroButtonClassName({ variant: "ghost", size: "lg" })}>
                  {t("nav.fighters")}
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        {/* Fight List */}
        <div id="fights" className="flex flex-col">
          {!authUser && featured && fights.length > 0 ? (
            <AnonFirstPickCta featuredEventHref={featuredHref} />
          ) : null}
          {fights.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold tracking-tight text-[var(--bp-ink)]">
                  {eventStatus === "completed" ? t("event.fightResultTitle") : t("event.fightListTitle")}
                </h2>
                {authUser && featured ? (
                  <HomeShareBar
                    ringName={selfRingName}
                    eventName={localizedEventName}
                    shareUrl={selfRingName ? buildSharePath(selfRingName, featured.id) : null}
                    hasAnyPicks={pickedCount > 0}
                  />
                ) : null}
              </div>

              <div className="flex flex-col gap-6">
              {fights.map((fight, index) => {
                const hasStarted = new Date(fight.start_time).getTime() <= nowTimestamp;
                const bc = bcFightData[index];
                const scResolution = scoreCardResolutions.get(fight.id);
                const scoreCard =
                  scResolution?.kind === "scored" ? scResolution.scoreCard : null;
                return (
                  <FightCard
                    key={fight.id}
                    index={index + 1}
                    isMainEvent={bc?.isMainEvent || index === 0}
                    fight={fight}
                    eventStatus={eventStatus ?? "upcoming"}
                    hasStarted={hasStarted}
                    prediction={predictionMap.get(fight.id) ?? null}
                    crowdStats={statsMap.get(fight.id) ?? null}
                    bcPrediction={bc ? { fighterA_pct: bc.fighterA_pct, fighterB_pct: bc.fighterB_pct } : null}
                    bcWeightClass={bc?.weightClass ?? null}
                    bcFighterADivision={bc?.fighterA_division ?? null}
                    bcFighterBDivision={bc?.fighterB_division ?? null}
                    seriesLabel={featured?.series_type === "black_cup" ? getSeriesLabel(featured.series_type, t) : null}
                    isAuthenticated={!!authUser}
                    scoreCard={scoreCard}
                  />
                );
              })}
              </div>
            </>
          ) : (
            <div className={retroPanelClassName({ className: "p-6 text-center" })}>
              <p className="text-sm text-[var(--bp-muted)]">{t("common.noData")}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col">
          <h2 className="mb-4 text-xl font-bold tracking-tight text-[var(--bp-ink)]">{t("rankingPage.snapshot")}</h2>

          <div className="flex flex-col gap-6">
          {/* Card 1: All-Time Rankings */}
          <section className={retroPanelClassName({ className: "p-4" })}>
            <p className="text-sm font-semibold text-[var(--bp-ink)]">{t("ranking.running")}</p>
            <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{t("common.rankingAllTimeDesc")}</p>

            <div className="mt-3 space-y-1">
              {allTimeUsers.length === 0 ? (
                <p className="py-4 text-center text-sm text-[var(--bp-muted)]">{t("common.noData")}</p>
              ) : (
                allTimeUsers.slice(0, 5).map((user, index) => {
                  const deltas = [2, 0, 1, -1, 3];
                  return (
                    <RankingRowCompact
                      key={user.id}
                      rank={index + 1}
                      delta={deltas[index] ?? 0}
                      name={user.ring_name}
                      value={user.score ?? 0}
                      unknownLabel={t("ranking.unknown")}
                    />
                  );
                })
              )}
            </div>
          </section>

          {/* Card 2: P4P Rankings (win rate) */}
          <section className={retroPanelClassName({ className: "p-4" })}>
            <p className="text-sm font-semibold text-[var(--bp-ink)]">P4P</p>
            <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{t("common.rankingP4pDesc")}</p>

            <div className="mt-3 space-y-1">
              {p4pUsers.length === 0 ? (
                <p className="py-3 text-center text-xs text-[var(--bp-muted)]">{t("common.noData")}</p>
              ) : (
                p4pUsers.map((user, index) => {
                  const deltas = [0, 1, -2, 0, 1];
                  return (
                    <RankingRowCompact
                      key={user.id}
                      rank={index + 1}
                      delta={deltas[index] ?? 0}
                      name={user.ring_name}
                      value={user.score ?? 0}
                      unknownLabel={t("ranking.unknown")}
                    />
                  );
                })
              )}
            </div>
          </section>

          {/* Card 3: Win Streak */}
          <section className={retroPanelClassName({ className: "p-4" })}>
            <p className="text-sm font-semibold text-[var(--bp-ink)]">{t("ranking.winStreak")}</p>
            <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{t("common.rankingStreakDesc")}</p>

            <div className="mt-3 space-y-1">
              {streakUsers.length === 0 ? (
                <p className="py-3 text-center text-xs text-[var(--bp-muted)]">{t("common.noData")}</p>
              ) : (
                streakUsers.map((user, index) => {
                  const streak = user.current_streak ?? 0;
                  const best = user.best_streak ?? 0;
                  const isOngoing = streak > 0 && streak === best;
                  return (
                    <RankingRowCompact
                      key={user.id}
                      rank={index + 1}
                      name={user.ring_name}
                      value={
                        <span className="flex items-center gap-1">
                          {best}W
                          {isOngoing ? (
                            <RetroLabel size="sm" tone="success">{t("event.liveBadge")}</RetroLabel>
                          ) : (
                            <span className="text-xs text-[var(--bp-muted)]">{t("ranking.best")}</span>
                          )}
                        </span>
                      }
                      unknownLabel={t("ranking.unknown")}
                    />
                  );
                })
              )}
            </div>
          </section>

          {/* Card 4: League Rankings (bottom) */}
          <LeagueRankingCard
            seriesTypes={seriesTypes}
            initialSeriesType={seriesTypes[0] ?? ""}
            initialUsers={initialLeagueUsers}
          />
          </div>
        </div>
      </div>
    </div>
  );
}
