import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";
import { getLocalizedEventName } from "@/lib/localized-name";
import { cn } from "@/lib/cn";
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
        <p className="text-[10px] text-[var(--bp-muted)]">{labels.streak}</p>
        <p className="text-xs font-semibold text-[var(--bp-ink)]">
          {user.current_streak ?? 0}/{user.best_streak ?? 0}
        </p>
      </div>
      <div className="text-center">
        <p className="text-[10px] text-[var(--bp-muted)]">{labels.hallOfFame}</p>
        <p className="text-xs font-semibold text-[var(--bp-ink)]">{user.hall_of_fame_count ?? 0}</p>
      </div>
    </div>
  );
}

export default async function RankingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { t, locale } = await getTranslations();
  const supabase = await createSupabaseServer();

  const tab = params.tab === "series" || params.tab === "event" ? params.tab : "running";
  const page = Math.max(1, Number(params.page || "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  const tabs = [
    { key: "running", label: t("ranking.running") },
    { key: "series", label: t("ranking.series") },
    { key: "event", label: t("ranking.event") },
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
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--bp-ink)]">{t("rankingPage.title")}</h1>
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
      </section>
    </div>
  );
}
