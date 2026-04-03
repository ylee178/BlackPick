import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";

const PAGE_SIZE = 50;

type SearchParams = Promise<{
  tab?: string;
  page?: string;
  reference_id?: string;
}>;

function getRankStyle(rank: number) {
  if (rank === 1) {
    return "border-yellow-500/40 bg-yellow-500/10";
  }
  if (rank === 2) {
    return "border-gray-400/40 bg-gray-400/10";
  }
  if (rank === 3) {
    return "border-amber-700/40 bg-amber-700/10";
  }
  return "border-gray-800 bg-gray-900/60";
}

function getRankTextStyle(rank: number) {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-gray-300";
  if (rank === 3) return "text-amber-600";
  return "text-white";
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { t } = await getTranslations();
  const tab = params.tab === "series" || params.tab === "event" ? params.tab : "running";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const referenceId = params.reference_id;

  const supabase = await createSupabaseServer();

  let rows:
    | Array<{
        id: string;
        ring_name: string;
        wins: number;
        losses: number;
        score: number;
        current_streak: number;
        best_streak: number;
      }>
    | null = null;

  let totalCount = 0;

  if (tab === "running") {
    const { data, count } = await supabase
      .from("users")
      .select(
        "id, ring_name, wins, losses, score, current_streak, best_streak, hall_of_fame_count, created_at",
        { count: "exact" }
      )
      .order("score", { ascending: false })
      .order("best_streak", { ascending: false })
      .order("current_streak", { ascending: false })
      .order("hall_of_fame_count", { ascending: false })
      .order("created_at", { ascending: true })
      .range(from, to);

    rows = data;
    totalCount = count ?? 0;
  } else if (referenceId) {
    const { data, count } = await supabase
      .from("rankings")
      .select(
        `
        id,
        score,
        rank,
        users:user_id (
          id,
          ring_name,
          wins,
          losses,
          current_streak,
          best_streak
        )
      `,
        { count: "exact" }
      )
      .eq("type", tab)
      .eq("reference_id", referenceId)
      .order("rank", { ascending: true })
      .range(from, to);

    rows =
      data?.map((item) => ({
        id: item.users?.id ?? item.id,
        ring_name: item.users?.ring_name ?? "Unknown",
        wins: item.users?.wins ?? 0,
        losses: item.users?.losses ?? 0,
        score: item.score ?? 0,
        current_streak: item.users?.current_streak ?? 0,
        best_streak: item.users?.best_streak ?? 0,
      })) ?? [];

    totalCount = count ?? 0;
  } else {
    rows = [];
    totalCount = 0;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const tabHref = (nextTab: "running" | "series" | "event") => {
    const query = new URLSearchParams();
    query.set("tab", nextTab);
    query.set("page", "1");
    if ((nextTab === "series" || nextTab === "event") && referenceId) {
      query.set("reference_id", referenceId);
    }
    return `/ranking?${query.toString()}`;
  };

  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams();
    query.set("tab", tab);
    query.set("page", String(nextPage));
    if (referenceId) query.set("reference_id", referenceId);
    return `/ranking?${query.toString()}`;
  };

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-400">
            {t("home.platformLabel")}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            {t("rankingPage.title")}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {t("rankingPage.description")}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(["running", "series", "event"] as const).map((item) => {
            const active = tab === item;
            return (
              <Link
                key={item}
                href={tabHref(item)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition ${
                  active
                    ? "bg-amber-400 text-gray-950"
                    : "border border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-700 hover:text-white"
                }`}
              >
                {item}
              </Link>
            );
          })}
        </div>

        {(tab === "series" || tab === "event") && !referenceId ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 text-gray-300">
            Provide a <span className="font-semibold text-white">reference_id</span> in
            the query string to view {tab} rankings.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="hidden grid-cols-[80px_1.5fr_140px_120px_140px_140px] gap-4 rounded-2xl border border-gray-800 bg-gray-900/70 px-5 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 md:grid">
              <div>Rank</div>
              <div>Ring Name</div>
              <div>Record</div>
              <div>Score</div>
              <div>Current</div>
              <div>Best</div>
            </div>

            {rows && rows.length > 0 ? (
              rows.map((row, index) => {
                const rank = from + index + 1;
                return (
                  <div
                    key={row.id}
                    className={`rounded-2xl border p-4 md:px-5 md:py-4 ${getRankStyle(rank)}`}
                  >
                    <div className="flex flex-col gap-3 md:grid md:grid-cols-[80px_1.5fr_140px_120px_140px_140px] md:items-center md:gap-4">
                      <div className={`text-2xl font-black md:text-lg ${getRankTextStyle(rank)}`}>
                        #{rank}
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 md:hidden">
                          Ring Name
                        </p>
                        <p className="text-lg font-bold text-white">{row.ring_name}</p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 md:hidden">
                          Record
                        </p>
                        <p className="font-semibold text-gray-200">
                          {row.wins}-{row.losses}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 md:hidden">
                          Score
                        </p>
                        <p className="font-black text-amber-400">{row.score}</p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 md:hidden">
                          Current Streak
                        </p>
                        <p className="font-semibold text-gray-200">{row.current_streak}</p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 md:hidden">
                          Best Streak
                        </p>
                        <p className="font-semibold text-gray-200">{row.best_streak}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/40 p-8 text-center text-gray-400">
                No ranking data found.
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          <Link
            href={page > 1 ? pageHref(page - 1) : "#"}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              page > 1
                ? "border border-gray-800 bg-gray-900 text-white hover:border-gray-700"
                : "cursor-not-allowed border border-gray-900 bg-gray-900 text-gray-600"
            }`}
          >
            Previous
          </Link>

          <p className="text-sm text-gray-400">
            Page <span className="font-semibold text-white">{page}</span> of{" "}
            <span className="font-semibold text-white">{totalPages}</span>
          </p>

          <Link
            href={page < totalPages ? pageHref(page + 1) : "#"}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              page < totalPages
                ? "border border-gray-800 bg-gray-900 text-white hover:border-gray-700"
                : "cursor-not-allowed border border-gray-900 bg-gray-900 text-gray-600"
            }`}
          >
            Next
          </Link>
        </div>
      </div>
    </main>
  );
}
