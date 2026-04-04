import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";

const PAGE_SIZE = 50;

type SearchParams = Promise<{
  tab?: string;
  page?: string;
  series?: string;
  event?: string;
}>;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getRankDecor(rank: number) {
  if (rank === 1) return { border: "border-[#ffba3c]/40", bg: "bg-[#ffba3c]/[0.04]", text: "text-[#ffba3c]", label: "1ST" };
  if (rank === 2) return { border: "border-white/15", bg: "bg-white/[0.02]", text: "text-white/70", label: "2ND" };
  if (rank === 3) return { border: "border-[#cd7f32]/30", bg: "bg-[#cd7f32]/[0.03]", text: "text-[#cd7f32]", label: "3RD" };
  return { border: "border-white/[0.04]", bg: "bg-white/[0.01]", text: "text-white/60", label: `#${rank}` };
}

function UserRow({ user, rank }: { user: any; rank: number }) {
  const d = getRankDecor(rank);
  const isTop3 = rank <= 3;

  return (
    <div className={cn(
      "gold-hover flex items-center gap-4 rounded-xl border p-4 transition md:gap-6",
      d.border, d.bg,
      isTop3 && "p-5"
    )}>
      {/* Rank */}
      <div className="w-12 shrink-0 text-center">
        <span
          className={cn("text-lg font-black", d.text, isTop3 && "text-2xl")}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {d.label}
        </span>
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          "truncate font-bold uppercase",
          isTop3 ? "text-lg text-white" : "text-sm text-white/80"
        )} style={{ fontFamily: "var(--font-display)" }}>
          {user.ring_name || "Unknown"}
        </p>
      </div>

      {/* Stats grid */}
      <div className="hidden items-center gap-6 md:flex">
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/50">Score</p>
          <p className="text-lg font-black text-[#ffba3c]" style={{ fontFamily: "var(--font-display)" }}>
            {user.score ?? 0}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/50">Record</p>
          <p className="text-sm font-bold text-white/60">
            {user.wins ?? 0}W-{user.losses ?? 0}L
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/50">Streak</p>
          <p className="text-sm font-bold text-white/60">
            {user.current_streak ?? 0}/{user.best_streak ?? 0}
          </p>
        </div>
        {(user.hall_of_fame_count ?? 0) > 0 && (
          <div className="text-center">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/50">HOF</p>
            <p className="text-sm font-bold text-[#ffba3c]">{user.hall_of_fame_count}</p>
          </div>
        )}
      </div>

      {/* Mobile stats */}
      <div className="flex items-center gap-3 md:hidden">
        <span className="text-sm font-black text-[#ffba3c]" style={{ fontFamily: "var(--font-display)" }}>
          {user.score ?? 0}
        </span>
        <span className="text-xs text-white/55">
          {user.wins ?? 0}W-{user.losses ?? 0}L
        </span>
      </div>
    </div>
  );
}

export default async function RankingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { t } = await getTranslations();
  const supabase = await createSupabaseServer();

  const tab = params.tab === "series" || params.tab === "event" ? params.tab : "running";
  const page = Math.max(1, Number(params.page || "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  // Tab definitions
  const tabs = [
    { key: "running", label: t("ranking.running") },
    { key: "series", label: t("ranking.series") },
    { key: "event", label: t("ranking.event") },
  ];

  // ── Running Ranking ──
  let users: any[] = [];
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

    users = data ?? [];
    hasNextPage = users.length > PAGE_SIZE;
    users = users.slice(0, PAGE_SIZE);
  }

  // ── Series Ranking ──
  let seriesData: any[] = [];
  const selectedSeries = params.series || "";

  if (tab === "series") {
    // Get unique series types
    const { data: events } = await supabase
      .from("events")
      .select("series_type")
      .order("series_type");

    const seriesTypes = [...new Set((events ?? []).map((e: any) => e.series_type))];

    // If a series is selected, get rankings for it
    if (selectedSeries) {
      // Get all events of this series type
      const { data: seriesEvents } = await supabase
        .from("events")
        .select("id")
        .eq("series_type", selectedSeries as "black_cup" | "numbering" | "rise" | "other");

      const eventIds = (seriesEvents ?? []).map((e: any) => e.id);

      if (eventIds.length > 0) {
        // Get rankings from the rankings table
        const { data } = await supabase
          .from("rankings")
          .select("*, user:users!user_id(ring_name, wins, losses, current_streak, best_streak, hall_of_fame_count)")
          .eq("type", "series")
          .in("reference_id", eventIds)
          .order("rank", { ascending: true })
          .limit(PAGE_SIZE);

        seriesData = data ?? [];
      }
    }

    // Pass seriesTypes for the selector
    seriesData = seriesData.length > 0 ? seriesData : [];
    // Store series types for rendering
    (seriesData as any).__seriesTypes = seriesTypes;
  }

  // ── Event Ranking ──
  let eventRankData: any[] = [];
  let eventList: any[] = [];
  const selectedEvent = params.event || "";

  if (tab === "event") {
    // Get current/recent events for selector (only post-launch events will have rankings)
    const { data: completedEvents } = await supabase
      .from("events")
      .select("id, name, date, status")
      .in("status", ["upcoming", "live", "completed"])
      .order("date", { ascending: false })
      .limit(10);

    eventList = completedEvents ?? [];

    if (selectedEvent) {
      const { data } = await supabase
        .from("rankings")
        .select("*, user:users!user_id(ring_name, wins, losses, current_streak, best_streak, hall_of_fame_count)")
        .eq("type", "event")
        .eq("reference_id", selectedEvent)
        .order("rank", { ascending: true })
        .limit(PAGE_SIZE);

      eventRankData = data ?? [];
    }
  }

  const seriesTypes = tab === "series" ? ((seriesData as any).__seriesTypes || []) : [];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-[#ffba3c]/40" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffba3c]">
            {t("home.platformLabel")}
          </span>
        </div>
        <h1
          className="mt-4 text-3xl font-black uppercase text-white md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("rankingPage.title")}
        </h1>
        <p className="mt-2 text-sm text-white/55">
          {t("rankingPage.description")}
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={`/ranking?tab=${item.key}`}
            className={cn(
              "rounded-lg border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.15em] transition",
              tab === item.key
                ? "border-[#ffba3c]/30 bg-[#ffba3c]/10 text-[#ffba3c]"
                : "border-white/[0.05] text-white/55 hover:border-white/10 hover:text-white/50"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="gold-line" />

      {/* ── Running Tab ── */}
      {tab === "running" && (
        <div className="space-y-3">
          {users.length === 0 ? (
            <div className="rounded-2xl border border-white/5 p-12 text-center">
              <p className="text-sm text-white/50">{t("common.noData")}</p>
              <p className="mt-2 text-xs text-white/45">
                Rankings will appear once users start predicting
              </p>
            </div>
          ) : (
            <>
              {/* Desktop header */}
              <div className="hidden items-center gap-4 px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-white/50 md:flex md:gap-6">
                <div className="w-12 text-center">{t("ranking.rank")}</div>
                <div className="flex-1">{t("ranking.ringName")}</div>
                <div className="flex items-center gap-6">
                  <div className="w-16 text-center">{t("ranking.score")}</div>
                  <div className="w-16 text-center">{t("ranking.record")}</div>
                  <div className="w-16 text-center">{t("ranking.streak")}</div>
                  <div className="w-12 text-center">{t("ranking.hallOfFame")}</div>
                </div>
              </div>

              {users.map((user, i) => (
                <UserRow key={user.id} user={user} rank={from + i + 1} />
              ))}

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <Link
                  href={page > 1 ? `/ranking?tab=running&page=${page - 1}` : "#"}
                  className={cn(
                    "rounded border px-4 py-2 text-xs font-medium transition",
                    page > 1
                      ? "border-white/8 text-white/50 hover:text-white"
                      : "pointer-events-none border-white/[0.03] text-white/45"
                  )}
                >
                  Prev
                </Link>
                <span className="text-xs text-white/50">Page {page}</span>
                <Link
                  href={hasNextPage ? `/ranking?tab=running&page=${page + 1}` : "#"}
                  className={cn(
                    "rounded border px-4 py-2 text-xs font-medium transition",
                    hasNextPage
                      ? "border-white/8 text-white/50 hover:text-white"
                      : "pointer-events-none border-white/[0.03] text-white/45"
                  )}
                >
                  Next
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Series Tab ── */}
      {tab === "series" && (
        <div className="space-y-6">
          {/* Series type selector */}
          <div className="flex flex-wrap gap-2">
            {(seriesTypes as string[]).map((st: string) => (
              <Link
                key={st}
                href={`/ranking?tab=series&series=${st}`}
                className={cn(
                  "rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-wider transition",
                  selectedSeries === st
                    ? "border-[#ffba3c]/30 bg-[#ffba3c]/10 text-[#ffba3c]"
                    : "border-white/5 text-white/55 hover:border-white/10"
                )}
              >
                {getSeriesLabel(st, t)}
              </Link>
            ))}
          </div>

          {!selectedSeries ? (
            <div className="rounded-2xl border border-white/5 p-12 text-center">
              <p className="text-sm text-white/50">Select a series to view rankings</p>
            </div>
          ) : seriesData.length === 0 ? (
            <div className="rounded-2xl border border-white/5 p-12 text-center">
              <p className="text-sm text-white/50">{t("common.noData")}</p>
              <p className="mt-2 text-xs text-white/45">
                Series rankings are calculated after events are completed
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {seriesData.map((row: any, i: number) => (
                <UserRow
                  key={row.id}
                  user={{ ...row.user, score: row.score }}
                  rank={row.rank || i + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Event Tab ── */}
      {tab === "event" && (
        <div className="space-y-6">
          {/* Event selector */}
          <div className="flex flex-wrap gap-2">
            {eventList.map((ev: any) => (
              <Link
                key={ev.id}
                href={`/ranking?tab=event&event=${ev.id}`}
                className={cn(
                  "rounded-lg border px-4 py-2 text-xs font-medium transition",
                  selectedEvent === ev.id
                    ? "border-[#ffba3c]/30 bg-[#ffba3c]/10 text-[#ffba3c]"
                    : "border-white/5 text-white/55 hover:border-white/10"
                )}
              >
                {ev.name}
              </Link>
            ))}
          </div>

          {!selectedEvent ? (
            <div className="rounded-2xl border border-white/5 p-12 text-center">
              <p className="text-sm text-white/50">Select an event to view rankings</p>
            </div>
          ) : eventRankData.length === 0 ? (
            <div className="rounded-2xl border border-white/5 p-12 text-center">
              <p className="text-sm text-white/50">{t("common.noData")}</p>
              <p className="mt-2 text-xs text-white/45">
                Event rankings are calculated when results are finalized
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventRankData.map((row: any, i: number) => (
                <UserRow
                  key={row.id}
                  user={{ ...row.user, score: row.score }}
                  rank={row.rank || i + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
