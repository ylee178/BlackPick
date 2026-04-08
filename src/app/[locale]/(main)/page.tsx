import { Link } from "@/i18n/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";
import { countryCodeToFlag } from "@/lib/flags";
import { getLocalizedEventName, getLocalizedFighterName } from "@/lib/localized-name";
import FightCard from "@/components/FightCard";
import FlipTimer from "@/components/FlipTimer";
import { Ticket, Play } from "lucide-react";
import LeagueRankingCard from "@/components/LeagueRankingCard";
import { fetchBcEventDataFull, type BcFightData } from "@/lib/bc-predictions";
import StickyEventHeader from "@/components/StickyEventHeader";
import {
  RetroEmptyState,
  RetroLabel,
  RetroStatusBadge,
  retroButtonClassName,
  retroChipClassName,
  retroPanelClassName,
} from "@/components/ui/retro";
import { RankingRowCompact } from "@/components/ui/ranking";
import type { Database } from "@/types/database";

export const revalidate = 60; // ISR: 1 minute

type EventRow = {
  id: string;
  name: string;
  date: string;
  status: "upcoming" | "live" | "completed";
  series_type: "black_cup" | "numbering" | "rise" | "other";
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

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { t, locale } = await getTranslations();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Stage 1: Fetch events, top users, and series types in parallel
  const [{ data: events }, { data: topUsers }, { data: seriesData }] = await Promise.all([
    supabase.from("events").select("id, name, date, status, series_type").order("date", { ascending: true }),
    supabase.from("users").select("id, ring_name, score, wins, losses, current_streak, best_streak").order("score", { ascending: false }).limit(10),
    supabase.from("events").select("series_type").order("series_type"),
  ]);

  const typedEvents = (events ?? []) as EventRow[];
  const activeEvents = typedEvents.filter((e) => e.status === "live" || e.status === "upcoming");
  const completedEvents = typedEvents.filter((e) => e.status === "completed").reverse();
  const featured = activeEvents[0] ?? completedEvents[0] ?? null;
  const isFeaturedCompleted = featured?.status === "completed";
  const allTimeUsers = (topUsers ?? []) as RankingUser[];
  let seriesTypes = [...new Set((seriesData ?? []).map((e: { series_type: string }) => e.series_type))];

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
  let statsMap = new Map<string, { fighter_a_percentage: number; fighter_b_percentage: number; total_predictions: number }>();
  let earliestStart: string | null = null;
  let initialLeagueUsers: { id: string; ring_name: string | null; score: number | null }[] = [];
  let bcFightData: BcFightData[] = [];
  let posterUrl: string | null = null;

  if (featured) {
    // Stage 2: Fetch fights + BC data in parallel (BC is external & slow)
    const [{ data: fightData }, bcFull] = await Promise.all([
      supabase
        .from("fights")
        .select(`
          id, event_id, fighter_a_id, fighter_b_id, start_time, status, winner_id, method, round,
          fighter_a:fighters!fighter_a_id(*),
          fighter_b:fighters!fighter_b_id(*)
        `)
        .eq("event_id", featured.id)
        .order("start_time", { ascending: false }),
      fetchBcEventDataFull(featured.name).catch(() => ({ fights: [] as BcFightData[], posterUrl: null })),
    ]);

    fights = (fightData ?? []) as FightWithFighters[];
    earliestStart = fights[0]?.start_time ?? null;
    bcFightData = bcFull.fights.slice(0, fights.length);
    posterUrl = bcFull.posterUrl;

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
  const nowTimestamp = Date.now();
  const pickedCount = fights.filter((f) => predictionMap.has(f.id)).length;

  // Black Cup completed: find winning country (cup matches only)
  const isBlackCup = featured?.series_type === "black_cup";
  let blackCupWinnerFlag: string | null = null;
  if (isBlackCup && eventStatus === "completed") {
    const countryMap = new Map<string, number>();
    for (const fight of fights) {
      if (fight.status !== "completed" || !fight.winner_id) continue;
      // Only count cup match fights (skip undercard)
      if (!(fight as Record<string, unknown>).is_cup_match) continue;
      const winner = fight.winner_id === fight.fighter_a_id ? fight.fighter_a : fight.fighter_b;
      const nat = (winner as Record<string, string | null> | null)?.nationality;
      if (nat) countryMap.set(nat, (countryMap.get(nat) ?? 0) + 1);
    }
    let topCountry = "";
    let topWins = 0;
    for (const [country, wins] of countryMap) {
      if (wins > topWins) { topCountry = country; topWins = wins; }
    }
    if (topCountry) blackCupWinnerFlag = countryCodeToFlag(topCountry);
  }

  const localizedEventName = featured ? getLocalizedEventName(featured, locale, featured.name) : "";

  return (
    <div className="flex flex-col gap-10">
      {/* Sticky sub-header for scrolling */}
      {featured ? (
        <StickyEventHeader
          eventName={localizedEventName}
          eventStatus={eventStatus ?? "upcoming"}
          countdownTargetTime={eventStatus === "upcoming" ? earliestStart : null}
          watchElementId={eventStatus === "upcoming" && earliestStart ? "home-timer" : "home-hero"}
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
                  {blackCupWinnerFlag && (
                    <RetroLabel size="sm" tone="accent">
                      {blackCupWinnerFlag} WIN
                    </RetroLabel>
                  )}
                  <RetroLabel size="sm" tone="neutral">{getSeriesLabel(featured.series_type, t)}</RetroLabel>
                  <span className="text-xs text-[var(--bp-muted)]">{featured.date}</span>
                </div>

                <h1 className="mt-4 text-2xl font-extrabold leading-[1.1] tracking-[-0.03em] text-[var(--bp-ink)] sm:text-3xl lg:text-4xl">
                  {getLocalizedEventName(featured, locale, featured.name)}
                </h1>

                <p className="mt-2 max-w-lg text-sm text-[var(--bp-muted)]">
                  {t("home.heroDescription")}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-[var(--bp-muted)]"><span className="font-semibold text-[var(--bp-ink)]">{fights.length}</span> {t("event.totalFights")}</span>
                  {authUser ? (
                    <>
                      <span className="text-[var(--bp-muted)]">·</span>
                      <span className="text-[var(--bp-muted)]"><span className="font-semibold text-[var(--bp-ink)]">{pickedCount}/{fights.length}</span> {t("event.picked")}</span>
                    </>
                  ) : null}
                </div>

                {eventStatus === "upcoming" ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a href="https://ticket.black-combat.com" target="_blank" rel="noopener noreferrer" className={retroButtonClassName({ variant: "primary", size: "sm" })}>
                      <Ticket className="h-4 w-4" strokeWidth={1.5} />
                      {t("home.buyTickets")}
                    </a>
                    <a href="https://www.youtube.com/@blackcombat" target="_blank" rel="noopener noreferrer" className={retroButtonClassName({ variant: "secondary", size: "sm" })}>
                      <Play className="h-4 w-4" strokeWidth={1.5} />
                      {t("home.watchLive")}
                    </a>
                  </div>
                ) : null}

                {!authUser ? (
                  <div className="mt-4">
                    <Link href="/signup" className={retroButtonClassName({ variant: "ghost", size: "sm" })}>
                      {t("nav.signup")}
                    </Link>
                  </div>
                ) : null}
              </div>

              {/* Right: Timer */}
              {eventStatus === "upcoming" && earliestStart ? (
                <div id="home-timer" className="shrink-0">
                  <FlipTimer targetTime={earliestStart} />
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
                <Link href="/events" className={retroButtonClassName({ variant: "primary", size: "lg" })}>
                  {t("nav.events")}
                </Link>
                <Link href="/ranking" className={retroButtonClassName({ variant: "ghost", size: "lg" })}>
                  {t("nav.ranking")}
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
          {fights.length > 0 ? (
            <>
              <h2 className="mb-4 text-xl font-bold tracking-tight text-[var(--bp-ink)]">
                {eventStatus === "completed" ? t("event.fightResultTitle") : t("event.fightListTitle")}
              </h2>

              <div className="flex flex-col gap-6">
              {fights.map((fight, index) => {
                const hasStarted = new Date(fight.start_time).getTime() <= nowTimestamp;
                const bc = bcFightData[index];
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
                  />
                );
              })}
              </div>
            </>
          ) : (
            <div className={retroPanelClassName({ className: "p-6 text-center" })}>
              <p className="text-sm text-[var(--bp-muted)]">{t("common.noData")}</p>
              <Link href="/events" className={retroButtonClassName({ variant: "primary", size: "sm", className: "mt-3" })}>
                {t("nav.events")}
              </Link>
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
                            <RetroLabel size="sm" tone="success">LIVE</RetroLabel>
                          ) : (
                            <span className="text-xs text-[var(--bp-muted)]">best</span>
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

          {/* Sign Up CTA */}
          {!authUser ? (
            <section className="rounded-[16px] border border-[rgba(229,169,68,0.15)] bg-[var(--bp-card)] p-4">
              <p className="text-sm font-semibold text-[var(--bp-ink)]">{t("auth.createAccount")}</p>
              <p className="mt-1 text-xs text-[var(--bp-muted)]">{t("auth.signupDescription")}</p>
              <div className="mt-3 flex gap-2">
                <Link href="/signup" className={retroButtonClassName({ variant: "primary", size: "sm" })}>
                  {t("nav.signup")}
                </Link>
                <Link href="/login" className={retroButtonClassName({ variant: "ghost", size: "sm" })}>
                  {t("nav.login")}
                </Link>
              </div>
            </section>
          ) : null}

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
