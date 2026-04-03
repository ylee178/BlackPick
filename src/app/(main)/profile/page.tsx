import Link from "next/link";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import type { Database } from "@/types/database";

type PredictionRow = Database["public"]["Tables"]["predictions"]["Row"] & {
  fights: {
    id: string;
    method: string | null;
    round: number | null;
    winner_id: string | null;
    status: string;
    start_time: string;
    events: {
      id: string;
      name: string;
      date: string;
    } | null;
    fighter_a: {
      id: string;
      name: string;
    } | null;
    fighter_b: {
      id: string;
      name: string;
    } | null;
  } | null;
  predicted_winner: {
    id: string;
    name: string;
  } | null;
};

function formatPredictionResult(prediction: PredictionRow) {
  if (prediction.score === null) return "Pending";

  if (prediction.is_winner_correct) {
    if (prediction.is_method_correct && prediction.is_round_correct) {
      return "Perfect Pick";
    }
    if (prediction.is_method_correct) {
      return "Winner + Method";
    }
    return "Winner Correct";
  }

  return "Miss";
}

function scoreColor(score: number | null) {
  if (score === null) return "text-gray-400";
  if (score > 0) return "text-emerald-400";
  if (score < 0) return "text-red-400";
  return "text-gray-300";
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServer();
  const authUser = await getUser();

  if (!authUser) {
    return (
      <main className="min-h-screen bg-gray-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-800 bg-gray-900/60 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="mt-4 text-gray-300">Sign in to view your profile</p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-amber-400 px-5 py-3 font-semibold text-gray-950 transition hover:bg-amber-300"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  const [{ data: profile }, { data: rankingUsers }, { data: predictions }] =
    await Promise.all([
      supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single(),
      supabase
        .from("users")
        .select("id, score, best_streak, current_streak, hall_of_fame_count, created_at")
        .order("score", { ascending: false })
        .order("best_streak", { ascending: false })
        .order("current_streak", { ascending: false })
        .order("hall_of_fame_count", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("predictions")
        .select(
          `
          *,
          fights (
            id,
            method,
            round,
            winner_id,
            status,
            start_time,
            events (
              id,
              name,
              date
            ),
            fighter_a:fighter_a_id (
              id,
              name
            ),
            fighter_b:fighter_b_id (
              id,
              name
            )
          ),
          predicted_winner:winner_id (
            id,
            name
          )
        `
        )
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const rank =
    rankingUsers?.findIndex((user) => user.id === authUser.id) !== undefined &&
    (rankingUsers?.findIndex((user) => user.id === authUser.id) ?? -1) >= 0
      ? (rankingUsers?.findIndex((user) => user.id === authUser.id) ?? 0) + 1
      : null;

  const typedPredictions = (predictions ?? []) as unknown as PredictionRow[];

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6 shadow-xl">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-amber-400">
                Fighter Profile
              </p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
                {profile?.ring_name ?? "Unknown Fighter"}
              </h1>
              <p className="mt-2 text-gray-400">{profile?.email}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-amber-400/20 bg-gray-950 p-5">
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  Fight Record
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-4xl font-black text-amber-400">
                    {profile?.wins ?? 0}
                  </span>
                  <span className="pb-1 text-xl font-bold text-gray-500">-</span>
                  <span className="text-4xl font-black text-white">
                    {profile?.losses ?? 0}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  Score
                </p>
                <p className="mt-3 text-4xl font-black text-white">
                  {profile?.score ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  Streaks
                </p>
                <p className="mt-3 text-lg font-bold text-white">
                  {profile?.current_streak ?? 0}
                  <span className="ml-2 text-sm font-medium text-gray-400">
                    current
                  </span>
                </p>
                <p className="mt-1 text-lg font-bold text-amber-400">
                  {profile?.best_streak ?? 0}
                  <span className="ml-2 text-sm font-medium text-gray-400">
                    best
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  Honors
                </p>
                <p className="mt-3 text-lg font-bold text-white">
                  {profile?.hall_of_fame_count ?? 0}
                  <span className="ml-2 text-sm font-medium text-gray-400">
                    Hall of Fame
                  </span>
                </p>
                <p className="mt-1 text-lg font-bold text-amber-400">
                  #{rank ?? "-"}
                  <span className="ml-2 text-sm font-medium text-gray-400">
                    ranking
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Recent Predictions</h2>
              <p className="text-sm text-gray-400">Last 20 picks</p>
            </div>
          </div>

          {typedPredictions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950/60 p-8 text-center text-gray-400">
              No predictions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {typedPredictions.map((prediction) => {
                const fight = prediction.fights;
                const fighterA = fight?.fighter_a?.name ?? "TBD";
                const fighterB = fight?.fighter_b?.name ?? "TBD";
                const predictedWinner = prediction.predicted_winner?.name ?? "Unknown";
                const resultText =
                  fight?.winner_id && fight?.status === "completed"
                    ? prediction.is_winner_correct
                      ? "Correct"
                      : "Wrong"
                    : "Pending";

                return (
                  <div
                    key={prediction.id}
                    className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-amber-400">
                          {fight?.events?.name ?? "Unknown Event"}
                        </p>
                        <h3 className="truncate text-lg font-bold text-white">
                          {fighterA} vs {fighterB}
                        </h3>
                        <p className="mt-1 text-sm text-gray-400">
                          Picked:{" "}
                          <span className="font-medium text-gray-200">
                            {predictedWinner}
                          </span>
                          {prediction.method ? ` • ${prediction.method}` : ""}
                          {prediction.round ? ` • R${prediction.round}` : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        <span className="rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300">
                          {formatPredictionResult(prediction)}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            resultText === "Correct"
                              ? "text-emerald-400"
                              : resultText === "Wrong"
                              ? "text-red-400"
                              : "text-gray-400"
                          }`}
                        >
                          {resultText}
                        </span>
                        <span className={`text-lg font-black ${scoreColor(prediction.score)}`}>
                          {prediction.score !== null
                            ? `${prediction.score > 0 ? "+" : ""}${prediction.score}`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
