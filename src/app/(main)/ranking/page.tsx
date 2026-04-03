import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";

type SearchParams = Promise<{
  page?: string;
}>;

type UserRow = {
  id: string;
  ring_name: string | null;
  wins: number | null;
  losses: number | null;
  current_streak: number | null;
  best_streak: number | null;
  hall_of_fame_count: number | null;
  score: number | null;
  created_at: string;
};

const PAGE_SIZE = 50;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getRankStyle(rank: number) {
  if (rank === 1) {
    return {
      badge:
        "bg-yellow-500/20 text-yellow-300 border-yellow-400/50",
      card:
        "border-yellow-400/60 bg-gradient-to-b from-yellow-500/10 to-gray-900/90 shadow-[0_0_30px_rgba(250,204,21,0.15)]",
      glow: "from-yellow-400/20",
      medal: "🥇",
    };
  }
  if (rank === 2) {
    return {
      badge:
        "bg-zinc-300/10 text-zinc-200 border-zinc-300/40",
      card:
        "border-zinc-300/40 bg-gradient-to-b from-zinc-200/5 to-gray-900/90 shadow-[0_0_24px_rgba(212,212,216,0.10)]",
      glow: "from-zinc-300/10",
      medal: "🥈",
    };
  }
  return {
    badge:
      "bg-amber-700/20 text-amber-300 border-amber-700/50",
    card:
      "border-amber-700/50 bg-gradient-to-b from-amber-700/10 to-gray-900/90 shadow-[0_0_24px_rgba(180,83,9,0.12)]",
    glow: "from-amber-700/10",
    medal: "🥉",
  };
}

function PodiumCard({
  user,
  rank,
}: {
  user: UserRow;
  rank: number;
}) {
  const style = getRankStyle(rank);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 sm:p-5",
        style.card,
        rank === 1 && "sm:-translate-y-2"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent",
          style.glow
        )}
      />
      <div className="relative flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                style.badge
              )}
            >
              <span>{style.medal}</span>
              <span>#{rank}</span>
            </div>
            <h2 className="mt-3 text-lg font-black uppercase tracking-wide text-white sm:text-xl">
              {user.ring_name || "Unknown Fighter"}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.2em] text-gray-400">
              Score
            </div>
            <div className="text-2xl font-black text-amber-400 sm:text-3xl">
              {user.score ?? 0}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-gray-900/70 p-3">
            <div className="text-[11px] uppercase tracking-wider text-gray-500">
              Record
            </div>
            <div className="mt-1 font-bold text-white">
              {user.wins ?? 0}W - {user.losses ?? 0}L
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-gray-900/70 p-3">
            <div className="text-[11px] uppercase tracking-wider text-gray-500">
              Streak
            </div>
            <div className="mt-1 font-bold text-white">
              🔥 {user.current_streak ?? 0} / {user.best_streak ?? 0}
            </div>
          </div>
        </div>

        {(user.hall_of_fame_count ?? 0) > 0 && (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
            <span>🏆</span>
            <span>{user.hall_of_fame_count} Hall of Fame</span>
          </div>
        )}
      </div>
    </div>
  );
}

function RankingRow({
  user,
  rank,
}: {
  user: UserRow;
  rank: number;
}) {
  const rankColor =
    rank === 1
      ? "text-yellow-300"
      : rank === 2
      ? "text-zinc-200"
      : rank === 3
      ? "text-amber-500"
      : "text-gray-300";

  return (
    <div className="rounded-2xl border border-white/10 bg-gray-900/70 p-4 transition hover:border-amber-400/30 hover:bg-gray-900">
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={cn("text-sm font-black", rankColor)}>#{rank}</div>
            <div className="truncate text-base font-bold uppercase tracking-wide text-white">
              {user.ring_name || "Unknown Fighter"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-gray-500">
              Score
            </div>
            <div className="text-lg font-black text-amber-400">
              {user.score ?? 0}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-white/10 bg-gray-950/70 p-3">
            <div className="text-[11px] uppercase tracking-wider text-gray-500">
              Record
            </div>
            <div className="mt-1 font-semibold text-white">
              {user.wins ?? 0}W - {user.losses ?? 0}L
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-gray-950/70 p-3">
            <div className="text-[11px] uppercase tracking-wider text-gray-500">
              Streak
            </div>
            <div className="mt-1 font-semibold text-white">
              🔥 {user.current_streak ?? 0} / {user.best_streak ?? 0}
            </div>
          </div>
        </div>

        {(user.hall_of_fame_count ?? 0) > 0 && (
          <div className="text-xs font-semibold text-amber-300">
            🏆 {user.hall_of_fame_count}
          </div>
        )}
      </div>

      <div className="hidden grid-cols-[80px_minmax(0,1.5fr)_120px_140px_180px_120px] items-center gap-4 sm:grid">
        <div className={cn("text-lg font-black", rankColor)}>#{rank}</div>
        <div className="min-w-0">
          <div className="truncate font-bold uppercase tracking-wide text-white">
            {user.ring_name || "Unknown Fighter"}
          </div>
        </div>
        <div className="font-black text-amber-400">{user.score ?? 0}</div>
        <div className="text-sm font-medium text-gray-200">
          {user.wins ?? 0}W - {user.losses ?? 0}L
        </div>
        <div className="text-sm font-medium text-gray-200">
          🔥 {user.current_streak ?? 0} / {user.best_streak ?? 0}
        </div>
        <div className="text-sm font-medium text-amber-300">
          {(user.hall_of_fame_count ?? 0) > 0
            ? `🏆 ${user.hall_of_fame_count}`
            : "-"}
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  hasNextPage,
}: {
  page: number;
  hasNextPage: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      <Link
        href={page > 1 ? `/ranking?page=${page - 1}` : "/ranking?page=1"}
        className={cn(
          "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition",
          page > 1
            ? "border-white/10 bg-gray-900 text-white hover:border-amber-400/40 hover:text-amber-300"
            : "pointer-events-none border-white/5 bg-gray-900/50 text-gray-600"
        )}
      >
        ← Prev
      </Link>

      <div className="text-sm font-medium text-gray-400">Page {page}</div>

      <Link
        href={`/ranking?page=${page + 1}`}
        className={cn(
          "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition",
          hasNextPage
            ? "border-white/10 bg-gray-900 text-white hover:border-amber-400/40 hover:text-amber-300"
            : "pointer-events-none border-white/5 bg-gray-900/50 text-gray-600"
        )}
      >
        Next →
      </Link>
    </div>
  );
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ t }, params, supabase] = await Promise.all([
    getTranslations(),
    searchParams,
    createSupabaseServer(),
  ]);

  const page = Math.max(1, Number(params.page || "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  const { data, error } = await supabase
    .from("users")
    .select(
      "id, ring_name, wins, losses, current_streak, best_streak, hall_of_fame_count, score, created_at"
    )
    .order("score", { ascending: false })
    .order("best_streak", { ascending: false })
    .order("current_streak", { ascending: false })
    .order("hall_of_fame_count", { ascending: false })
    .order("created_at", { ascending: true })
    .range(from, to);

  const users: UserRow[] = error ? [] : (data ?? []);
  const hasNextPage = users.length > PAGE_SIZE;
  const pageUsers = users.slice(0, PAGE_SIZE);

  const topThree = page === 1 ? pageUsers.slice(0, 3) : [];
  const restUsers = page === 1 ? pageUsers.slice(3) : pageUsers;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-8">
          <div className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
            Black Pick
          </div>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            {t("rankingPage.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base">
            {t("rankingPage.description")}
          </p>
        </header>

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300"
          >
            {t("ranking.running")}
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center rounded-xl border border-white/10 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-500"
          >
            {t("ranking.series")} · {t("common.comingSoon")}
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center rounded-xl border border-white/10 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-500"
          >
            {t("ranking.event")} · {t("common.comingSoon")}
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            Failed to load rankings.
          </div>
        ) : pageUsers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-gray-900/70 p-8 text-center text-gray-400">
            No rankings yet.
          </div>
        ) : (
          <>
            {topThree.length > 0 && (
              <section className="mb-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">
                    Champions
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
                </div>

                <div className="grid gap-4 md:grid-cols-3 md:items-end">
                  {topThree[1] && <PodiumCard user={topThree[1]} rank={2} />}
                  {topThree[0] && <PodiumCard user={topThree[0]} rank={1} />}
                  {topThree[2] && <PodiumCard user={topThree[2]} rank={3} />}
                </div>
              </section>
            )}

            <section>
              <div className="mb-4 hidden grid-cols-[80px_minmax(0,1.5fr)_120px_140px_180px_120px] gap-4 px-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-500 sm:grid">
                <div>{t("ranking.rank")}</div>
                <div>{t("ranking.ringName")}</div>
                <div>{t("ranking.score")}</div>
                <div>{t("ranking.record")}</div>
                <div>{t("ranking.streak")}</div>
                <div>{t("ranking.hallOfFame")}</div>
              </div>

              <div className="space-y-3">
                {restUsers.map((user, index) => {
                  const rank = from + (page === 1 ? 4 : 1) + index;
                  return <RankingRow key={user.id} user={user} rank={rank} />;
                })}
              </div>
            </section>

            <Pagination page={page} hasNextPage={hasNextPage} />
          </>
        )}
      </div>
    </main>
  );
}
