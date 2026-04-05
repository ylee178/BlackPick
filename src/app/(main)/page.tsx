import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";
import { getLocalizedEventName, getLocalizedFighterName } from "@/lib/localized-name";
import FightCard from "@/components/FightCard";
import FlipTimer from "@/components/FlipTimer";
import EventRankingCard from "@/components/EventRankingCard";
import StickyEventHeader from "@/components/StickyEventHeader";
import {
  RetroEmptyState,
  RetroStatusBadge,
  retroButtonClassName,
  retroChipClassName,
  retroPanelClassName,
} from "@/components/ui/retro";
import { RankingRowCompact } from "@/components/ui/ranking";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

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

  // Fetch all data in parallel
  const [{ data: events }, { data: topUsers }] = await Promise.all([
    supabase.from("events").select("id, name, date, status, series_type").order("date", { ascending: true }),
    supabase.from("users").select("id, ring_name, score, wins, losses").order("score", { ascending: false }).limit(10),
  ]);

  const typedEvents = (events ?? []) as EventRow[];
  const activeEvents = typedEvents.filter((e) => e.status === "live" || e.status === "upcoming");
  const completedEvents = typedEvents.filter((e) => e.status === "completed").reverse();
  // Show active event first, fall back to latest completed
  const featured = activeEvents[0] ?? completedEvents[0] ?? null;
  const isFeaturedCompleted = featured?.status === "completed";
  const allTimeUsers = (topUsers ?? []) as RankingUser[];

  // P4P ranking: users sorted by win rate (min 5 fights)
  const p4pUsers = [...allTimeUsers]
    .filter((u) => ((u.wins ?? 0) + (u.losses ?? 0)) >= 5)
    .sort((a, b) => {
      const rateA = (a.wins ?? 0) / Math.max(1, (a.wins ?? 0) + (a.losses ?? 0));
      const rateB = (b.wins ?? 0) / Math.max(1, (b.wins ?? 0) + (b.losses ?? 0));
      return rateB - rateA;
    })
    .slice(0, 5);

  // Fetch fights for featured event
  let fights: FightWithFighters[] = [];
  let predictionMap = new Map<string, PredictionRow>();
  let statsMap = new Map<string, { fighter_a_percentage: number; fighter_b_percentage: number; total_predictions: number }>();
  let earliestStart: string | null = null;

  // Fetch event rankings for the latest completed event
  let eventRankUsers: RankingUser[] = [];
  const latestCompleted = completedEvents[0] ?? null;

  if (featured) {
    const { data: fightData } = await supabase
      .from("fights")
      .select(`
        id, event_id, fighter_a_id, fighter_b_id, start_time, status, winner_id, method, round,
        fighter_a:fighters!fighter_a_id(*),
        fighter_b:fighters!fighter_b_id(*)
      `)
      .eq("event_id", featured.id)
      .order("start_time", { ascending: true });

    fights = (fightData ?? []) as FightWithFighters[];
    earliestStart = fights[0]?.start_time ?? null;
    const fightIds = fights.map((f) => f.id);

    const [{ data: preds }, { data: statsData }, { data: eventRanks }] = await Promise.all([
      authUser && fightIds.length > 0
        ? supabase.from("predictions").select("*").eq("user_id", authUser.id).in("fight_id", fightIds)
        : Promise.resolve({ data: [] as PredictionRow[] }),
      fightIds.length > 0
        ? supabase.from("predictions").select("fight_id, winner_id").in("fight_id", fightIds)
        : Promise.resolve({ data: [] as PredictionVoteRow[] }),
      latestCompleted
        ? supabase
            .from("rankings")
            .select("id, rank, score, user:users!user_id(id, ring_name, score, wins, losses)")
            .eq("type", "event")
            .eq("reference_id", latestCompleted.id)
            .order("rank", { ascending: true })
            .limit(10)
        : Promise.resolve({ data: [] }),
    ]);

    predictionMap = new Map((preds ?? []).map((p: PredictionRow) => [p.fight_id, p]));

    for (const fight of fights) {
      const rows = ((statsData ?? []) as PredictionVoteRow[]).filter((p) => p.fight_id === fight.id);
      const total = rows.length;
      const aCount = rows.filter((p) => p.winner_id === fight.fighter_a_id).length;
      statsMap.set(fight.id, {
        fighter_a_percentage: total > 0 ? Math.round((aCount / total) * 100) : 0,
        fighter_b_percentage: total > 0 ? Math.round(((total - aCount) / total) * 100) : 0,
        total_predictions: total,
      });
    }

    eventRankUsers = ((eventRanks ?? []) as Array<{ user: RankingUser | null }>)
      .filter((r) => r.user)
      .map((r) => r.user!);
  }

  const eventStatus = featured?.status as "upcoming" | "live" | "completed" | undefined;
  const nowTimestamp = Date.now();
  const pickedCount = fights.filter((f) => predictionMap.has(f.id)).length;

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
        <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[rgba(229,169,68,0.06)] blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[rgba(229,169,68,0.04)] blur-[80px]" />

        <div className="relative p-4 sm:p-6 lg:p-8">
          {featured ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <RetroStatusBadge tone={getStatusTone(featured.status)}>
                  {t(`status.${featured.status}`)}
                </RetroStatusBadge>
                <span className={retroChipClassName({ tone: "neutral" })}>{getSeriesLabel(featured.series_type, t)}</span>
                <span className="text-xs text-[var(--bp-muted)]">{featured.date}</span>
              </div>

              <h1 className="mt-4 text-2xl font-extrabold leading-[1.1] tracking-[-0.03em] text-[var(--bp-ink)] sm:text-3xl lg:text-4xl">
                {getLocalizedEventName(featured, locale, featured.name)}
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-[var(--bp-muted)]">
                {t("home.heroDescription")}
              </p>

              {/* Stats row */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-[var(--bp-ink)]">{fights.length} {t("event.totalFights")}</span>
                <span className="text-[var(--bp-muted)]">·</span>
                {authUser ? (
                  <span className="text-[var(--bp-muted)]">{pickedCount}/{fights.length} {t("prediction.yourPick")}</span>
                ) : null}
              </div>

              {/* Timer */}
              {eventStatus === "upcoming" && earliestStart ? (
                <div id="home-timer" className="mt-4">
                  <FlipTimer targetTime={earliestStart} />
                </div>
              ) : null}

              {/* CTA buttons */}
              {eventStatus === "upcoming" ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href="https://ticket.black-combat.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={retroButtonClassName({ variant: "primary", size: "sm" })}
                  >
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 5.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1a1.5 1.5 0 0 0 0 3v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1a1.5 1.5 0 0 0 0-3v-1Z" />
                    </svg>
                    {t("home.buyTickets")}
                  </a>
                  <a
                    href="https://www.youtube.com/@blackcombat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={retroButtonClassName({ variant: "ghost", size: "sm" })}
                  >
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                      <path d="M14.7 4.5a1.8 1.8 0 0 0-1.2-1.2C12.3 3 8 3 8 3s-4.3 0-5.5.3A1.8 1.8 0 0 0 1.3 4.5C1 5.7 1 8 1 8s0 2.3.3 3.5a1.8 1.8 0 0 0 1.2 1.2C3.7 13 8 13 8 13s4.3 0 5.5-.3a1.8 1.8 0 0 0 1.2-1.2C15 10.3 15 8 15 8s0-2.3-.3-3.5ZM6.5 10.2V5.8L10.4 8l-3.9 2.2Z" />
                    </svg>
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
            </>
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
        <div id="fights" className="flex flex-col gap-6">
          {fights.length > 0 ? (
            <>
              <h2 className="text-lg font-bold tracking-tight text-[var(--bp-ink)]">
                {t("event.fights")} ({fights.length})
              </h2>

              {fights.map((fight, index) => {
                const hasStarted = new Date(fight.start_time).getTime() <= nowTimestamp;
                return (
                  <FightCard
                    key={fight.id}
                    index={index + 1}
                    fight={fight}
                    eventStatus={eventStatus ?? "upcoming"}
                    hasStarted={hasStarted}
                    prediction={predictionMap.get(fight.id) ?? null}
                    crowdStats={statsMap.get(fight.id) ?? null}
                  />
                );
              })}
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
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-bold tracking-tight text-[var(--bp-ink)]">Black Pick Ranking</h2>

          {/* Card 1: All-Time Rankings */}
          <section className={retroPanelClassName({ className: "p-4" })}>
            <p className="text-sm font-semibold text-[var(--bp-ink)]">{t("ranking.running")}</p>

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
            <p className="mt-0.5 text-[11px] text-[var(--bp-muted)]">{t("common.winRate")}</p>

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

          {/* Card 3: Event Rankings (with arrow navigation) */}
          <EventRankingCard
            completedEvents={completedEvents}
            initialEventIndex={0}
            initialUsers={eventRankUsers}
          />

          {/* Card 4: Sign Up CTA */}
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
        </div>
      </div>
    </div>
  );
}
