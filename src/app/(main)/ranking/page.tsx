import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";
import { getLocalizedEventName } from "@/lib/localized-name";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RetroEmptyState,
  retroPanelClassName,
  retroSegmentClassName,
} from "@/components/ui/retro";
import { RankingRowFull } from "@/components/ui/ranking";

const PAGE_SIZE = 50;

type SearchParams = Promise<{
  tab?: string;
  page?: string;
  series?: string;
  event?: string;
}>;

type RankingUser = {
  id: string;
  ring_name: string | null;
  wins: number | null;
  losses: number | null;
  current_streak: number | null;
  best_streak: number | null;
  hall_of_fame_count: number | null;
  score: number | null;
};

function UserExtra({ user, labels }: { user: RankingUser; labels: { streak: string; hallOfFame: string } }) {
  return (
    <div className="hidden items-center gap-5 md:flex">
      <div className="text-center">
        <p className="flex items-center justify-center gap-0.5 text-xs text-[var(--bp-muted)]">
          <Flame className="h-3 w-3 text-[var(--bp-accent)]" strokeWidth={2} />
          {labels.streak}
        </p>
        <p className="text-xs font-semibold text-[var(--bp-ink)]">
          {user.current_streak ?? 0}/{user.best_streak ?? 0}
        </p>
      </div>
      <div className="text-center">
        <p className="text-xs text-[var(--bp-muted)]">{labels.hallOfFame}</p>
        <p className="text-xs font-semibold text-[var(--bp-ink)]">{user.hall_of_fame_count ?? 0}</p>
      </div>
    </div>
  );
}

export default async function RankingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { t, locale } = await getTranslations();
  const supabase = await createSupabaseServer();

  const validTabs = ["running", "p4p", "series", "streak", "hof"] as const;
  const tab = validTabs.includes(params.tab as any) ? (params.tab as string) : "running";
  const page = Math.max(1, Number(params.page || "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  const tabs = [
    { key: "running", label: t("ranking.running") },
    { key: "p4p", label: "P4P" },
    { key: "series", label: t("ranking.series") },
    { key: "streak", label: t("ranking.winStreak") },
    { key: "hof", label: t("ranking.hallOfFame") },
  ];

  let users: RankingUser[] = [];
  let hasNextPage = false;

  if (tab === "running") {
    const { data } = await supabase
      .from("users")
      .select("id, ring_name, wins, losses, current_streak, best_streak, hall_of_fame_count, score, created_at")
      .order("score", { ascending: false })
      .order("best_streak", { ascending: false })
      .order("current_streak", { ascending: false })
      .order("hall_of_fame_count", { ascending: false })
      .order("created_at", { ascending: true })
      .range(from, to);

    users = (data ?? []) as RankingUser[];
    hasNextPage = users.length > PAGE_SIZE;
    users = users.slice(0, PAGE_SIZE);
  }

  let p4pUsers: (RankingUser & { p4p_score: number })[] = [];
  if (tab === "p4p") {
    const { data } = await supabase
      .from("users")
      .select("id, ring_name, wins, losses, current_streak, best_streak, hall_of_fame_count, score, p4p_score")
      .gt("p4p_score", 0)
      .order("p4p_score", { ascending: false })
      .limit(PAGE_SIZE);

    p4pUsers = (data ?? []) as (RankingUser & { p4p_score: number })[];
  }

  let streakUsers: RankingUser[] = [];
  if (tab === "streak") {
    const { data } = await supabase
      .from("users")
      .select("id, ring_name, wins, losses, current_streak, best_streak, hall_of_fame_count, score")
      .gt("current_streak", 0)
      .order("current_streak", { ascending: false })
      .order("best_streak", { ascending: false })
      .limit(PAGE_SIZE);

    streakUsers = (data ?? []) as RankingUser[];
  }

  let hofUsers: (RankingUser & { oracle: number; sniper: number; sharp_call: number })[] = [];
  if (tab === "hof") {
    const { data } = await supabase
      .from("users")
      .select("id, ring_name, wins, losses, current_streak, best_streak, hall_of_fame_count, score")
      .gt("hall_of_fame_count", 0)
      .order("hall_of_fame_count", { ascending: false })
      .order("score", { ascending: false })
      .limit(PAGE_SIZE);

    const hofUserIds = (data ?? []).map((u: { id: string }) => u.id);

    // Get tier breakdown per user
    let tierCounts = new Map<string, { oracle: number; sniper: number; sharp_call: number }>();
    if (hofUserIds.length > 0) {
      const { data: entries } = await supabase
        .from("hall_of_fame_entries")
        .select("user_id, tier")
        .in("user_id", hofUserIds);

      for (const e of (entries ?? []) as { user_id: string; tier: string }[]) {
        if (!tierCounts.has(e.user_id)) tierCounts.set(e.user_id, { oracle: 0, sniper: 0, sharp_call: 0 });
        const tc = tierCounts.get(e.user_id)!;
        if (e.tier === "oracle") tc.oracle++;
        else if (e.tier === "sniper") tc.sniper++;
        else if (e.tier === "sharp_call") tc.sharp_call++;
      }
    }

    hofUsers = (data ?? []).map((u: RankingUser) => ({
      ...u,
      oracle: tierCounts.get(u.id)?.oracle ?? 0,
      sniper: tierCounts.get(u.id)?.sniper ?? 0,
      sharp_call: tierCounts.get(u.id)?.sharp_call ?? 0,
    }));
  }

  let seriesData: Array<{ id: string; rank: number | null; score: number | null; user: RankingUser | null }> = [];
  let seriesTypes: string[] = [];
  const selectedSeries = params.series || "";

  if (tab === "series") {
    const { data: events } = await supabase.from("events").select("series_type").order("series_type");
    seriesTypes = [...new Set((events ?? []).map((event: { series_type: string }) => event.series_type))];

    if (selectedSeries) {
      const { data: seriesEvents } = await supabase
        .from("events")
        .select("id")
        .eq("series_type", selectedSeries as "black_cup" | "numbering" | "rise" | "other");

      const eventIds = (seriesEvents ?? []).map((event: { id: string }) => event.id);

      if (eventIds.length > 0) {
        const { data } = await supabase
          .from("rankings")
          .select("id, rank, score, user:users!user_id(id, ring_name, wins, losses, current_streak, best_streak, hall_of_fame_count, score)")
          .eq("type", "series")
          .in("reference_id", eventIds)
          .order("rank", { ascending: true })
          .limit(PAGE_SIZE);

        seriesData = (data ?? []) as Array<{ id: string; rank: number | null; score: number | null; user: RankingUser | null }>;
      }
    }
  }

  let eventRankData: Array<{ id: string; rank: number | null; score: number | null; user: RankingUser | null }> = [];
  let eventList: Array<{ id: string; name: string; date: string; status: string }> = [];
  const selectedEvent = params.event || "";

  if (tab === "event") {
    const { data: availableEvents } = await supabase
      .from("events")
      .select("id, name, date, status")
      .in("status", ["upcoming", "live", "completed"])
      .order("date", { ascending: false })
      .limit(10);

    eventList = availableEvents ?? [];

    if (selectedEvent) {
      const { data } = await supabase
        .from("rankings")
        .select("id, rank, score, user:users!user_id(id, ring_name, wins, losses, current_streak, best_streak, hall_of_fame_count, score)")
        .eq("type", "event")
        .eq("reference_id", selectedEvent)
        .order("rank", { ascending: true })
        .limit(PAGE_SIZE);

      eventRankData = (data ?? []) as Array<{ id: string; rank: number | null; score: number | null; user: RankingUser | null }>;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--bp-ink)]">{t("rankingPage.title")}</h1>
        <p className="mt-1 text-sm text-[var(--bp-muted)]">{t("rankingPage.description")}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <Link
              key={item.key}
              href={`/ranking?tab=${item.key}`}
              className={retroSegmentClassName({ active: tab === item.key })}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <section className={retroPanelClassName({ className: "p-4" })}>
        {tab === "p4p" ? (
          p4pUsers.length === 0 ? (
            <RetroEmptyState title={t("common.noData")} description={t("common.rankingP4pDesc")} />
          ) : (
            <div className="space-y-2">
              {p4pUsers.map((user, index) => (
                <RankingRowFull
                  key={user.id}
                  rank={index + 1}
                  name={user.ring_name}
                  record={`${user.wins ?? 0}W-${user.losses ?? 0}L`}
                  score={user.p4p_score}
                  unknownLabel={t("ranking.unknown")}
                  extra={<UserExtra user={user} labels={{ streak: t("ranking.streak"), hallOfFame: t("ranking.hallOfFame") }} />}
                />
              ))}
            </div>
          )
        ) : null}

        {tab === "series" ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {seriesTypes.map((seriesType) => (
              <Link
                key={seriesType}
                href={`/ranking?tab=series&series=${seriesType}`}
                className={retroSegmentClassName({ active: selectedSeries === seriesType })}
              >
                {getSeriesLabel(seriesType, t)}
              </Link>
            ))}
          </div>
        ) : null}

        {tab === "event" ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {eventList.map((event) => (
              <Link
                key={event.id}
                href={`/ranking?tab=event&event=${event.id}`}
                className={retroSegmentClassName({ active: selectedEvent === event.id, className: "max-w-full" })}
              >
                <span className="truncate">
                  {getLocalizedEventName(event, locale, event.name)}
                </span>
              </Link>
            ))}
          </div>
        ) : null}

        {tab === "running" ? (
          users.length === 0 ? (
            <RetroEmptyState title={t("common.noData")} />
          ) : (
            <div className="space-y-2">
              {users.map((user, index) => (
                <RankingRowFull
                  key={user.id}
                  rank={from + index + 1}
                  name={user.ring_name}
                  record={`${user.wins ?? 0}W-${user.losses ?? 0}L`}
                  score={user.score ?? 0}
                  unknownLabel={t("ranking.unknown")}
                  extra={<UserExtra user={user} labels={{ streak: t("ranking.streak"), hallOfFame: t("ranking.hallOfFame") }} />}
                />
              ))}

              <div className="flex items-center justify-between pt-2">
                <Link
                  href={page > 1 ? `/ranking?tab=running&page=${page - 1}` : "#"}
                  className={cn(retroSegmentClassName({ active: false }), page <= 1 && "pointer-events-none opacity-40")}
                >
                  ←
                </Link>
                <span className="text-sm text-[var(--bp-muted)]">{page}</span>
                <Link
                  href={hasNextPage ? `/ranking?tab=running&page=${page + 1}` : "#"}
                  className={cn(retroSegmentClassName({ active: false }), !hasNextPage && "pointer-events-none opacity-40")}
                >
                  →
                </Link>
              </div>
            </div>
          )
        ) : null}

        {tab === "series" ? (
          !selectedSeries ? (
            <RetroEmptyState title={t("common.noData")} description={t("ranking.series")} />
          ) : seriesData.length === 0 ? (
            <RetroEmptyState title={t("common.noData")} />
          ) : (
            <div className="space-y-2">
              {seriesData.map((row, index) => (row.user ? (
                <RankingRowFull
                  key={row.id}
                  rank={row.rank || index + 1}
                  name={row.user.ring_name}
                  record={`${row.user.wins ?? 0}W-${row.user.losses ?? 0}L`}
                  score={row.score ?? row.user.score ?? 0}
                  unknownLabel={t("ranking.unknown")}
                  extra={<UserExtra user={row.user} labels={{ streak: t("ranking.streak"), hallOfFame: t("ranking.hallOfFame") }} />}
                />
              ) : null))}
            </div>
          )
        ) : null}

        {tab === "event" ? (
          !selectedEvent ? (
            <RetroEmptyState title={t("common.noData")} description={t("ranking.event")} />
          ) : eventRankData.length === 0 ? (
            <RetroEmptyState title={t("common.noData")} />
          ) : (
            <div className="space-y-2">
              {eventRankData.map((row, index) => (row.user ? (
                <RankingRowFull
                  key={row.id}
                  rank={row.rank || index + 1}
                  name={row.user.ring_name}
                  record={`${row.user.wins ?? 0}W-${row.user.losses ?? 0}L`}
                  score={row.score ?? row.user.score ?? 0}
                  unknownLabel={t("ranking.unknown")}
                  extra={<UserExtra user={row.user} labels={{ streak: t("ranking.streak"), hallOfFame: t("ranking.hallOfFame") }} />}
                />
              ) : null))}
            </div>
          )
        ) : null}

        {tab === "streak" ? (
          streakUsers.length === 0 ? (
            <RetroEmptyState title={t("common.noData")} />
          ) : (
            <div className="space-y-2">
              {streakUsers.map((user, index) => (
                <RankingRowFull
                  key={user.id}
                  rank={index + 1}
                  name={user.ring_name}
                  record={`${user.wins ?? 0}W-${user.losses ?? 0}L`}
                  score={`${user.current_streak ?? 0}W`}
                  unknownLabel={t("ranking.unknown")}
                  extra={<UserExtra user={user} labels={{ streak: t("ranking.streak"), hallOfFame: t("ranking.hallOfFame") }} />}
                />
              ))}
            </div>
          )
        ) : null}

        {tab === "hof" ? (
          hofUsers.length === 0 ? (
            <RetroEmptyState title={t("common.noData")} />
          ) : (
            <div className="space-y-2">
              {hofUsers.map((user, index) => (
                <RankingRowFull
                  key={user.id}
                  rank={index + 1}
                  name={user.ring_name}
                  record={`${user.wins ?? 0}W-${user.losses ?? 0}L`}
                  score={user.hall_of_fame_count ?? 0}
                  unknownLabel={t("ranking.unknown")}
                  extra={
                    <div className="hidden items-center gap-4 md:flex">
                      {user.oracle > 0 && (
                        <div className="text-center">
                          <p className="text-xs text-[var(--bp-accent)]">Oracle</p>
                          <p className="text-xs font-semibold text-[var(--bp-ink)]">{user.oracle}</p>
                        </div>
                      )}
                      {user.sniper > 0 && (
                        <div className="text-center">
                          <p className="text-xs text-[var(--bp-accent)]">Sniper</p>
                          <p className="text-xs font-semibold text-[var(--bp-ink)]">{user.sniper}</p>
                        </div>
                      )}
                      {user.sharp_call > 0 && (
                        <div className="text-center">
                          <p className="text-xs text-[var(--bp-muted)]">Sharp Call</p>
                          <p className="text-xs font-semibold text-[var(--bp-ink)]">{user.sharp_call}</p>
                        </div>
                      )}
                    </div>
                  }
                />
              ))}
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
