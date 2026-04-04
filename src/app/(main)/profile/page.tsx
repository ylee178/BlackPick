import Link from "next/link";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  const { t } = await getTranslations();

  if (!authUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-[#ffba3c]/20 bg-[#ffba3c]/[0.04]">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#ffba3c]/60" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
              <path d="M3 20a9 9 0 0 1 18 0" />
            </svg>
          </div>
          <h2 className="text-2xl font-black uppercase text-white" style={{ fontFamily: "var(--font-display)" }}>
            {t("profile.myAccount")}
          </h2>
          <p className="mt-2 text-sm text-white/50">{t("profile.signInToView")}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-lg border border-white/10 px-6 py-2.5 text-sm font-medium text-white/70 hover:border-[#ffba3c]/30">
            Log in
          </Link>
          <Link href="/signup" className="rounded-lg bg-[#ffba3c] px-6 py-2.5 text-sm font-bold text-black hover:bg-[#ffd06b]">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single();
  const { count: higherCount } = await supabase.from("users").select("*", { count: "exact", head: true }).gt("score", user?.score ?? 0);
  const { count: totalUsers } = await supabase.from("users").select("*", { count: "exact", head: true });
  const rank = (higherCount ?? 0) + 1;

  const { data: recentPreds } = await supabase
    .from("predictions")
    .select(`
      id, winner_id, method, round, score, is_winner_correct, created_at,
      fight:fights!fight_id(
        id, status, winner_id, method, round,
        fighter_a:fighters!fighter_a_id(id, name, ring_name),
        fighter_b:fighters!fighter_b_id(id, name, ring_name),
        event:events!event_id(id, name, date)
      )
    `)
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const wins = user?.wins ?? 0;
  const losses = user?.losses ?? 0;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Header Card ── */}
      <div className="premium-card relative overflow-hidden rounded-2xl p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffba3c]/25 to-transparent" />
        <div className="relative flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#ffba3c]/30 bg-[#ffba3c]/[0.06]">
            <span className="text-2xl font-black text-[#ffba3c]" style={{ fontFamily: "var(--font-display)" }}>
              {(user?.ring_name ?? "?")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase text-white" style={{ fontFamily: "var(--font-display)" }}>
              {user?.ring_name ?? "Fighter"}
            </h1>
            <p className="text-sm text-white/50">{authUser.email}</p>
          </div>
        </div>
      </div>

      {/* ── Streak Banner ── */}
      {(user?.current_streak ?? 0) > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-[#ffba3c]/20 bg-[#ffba3c]/[0.05] px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffba3c]/15 text-lg">
            F
          </div>
          <div>
            <p className="text-xl font-black text-[#ffba3c]" style={{ fontFamily: "var(--font-display)" }}>
              {user?.current_streak} {t("ranking.streak")}
            </p>
            <p className="text-xs text-white/50">{t("profile.bestStreak")}: {user?.best_streak}</p>
          </div>
        </div>
      )}

      {/* ── Stats Grid (2x2 mobile, 4 col desktop) ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="gold-hover rounded-xl border border-white/[0.05] bg-[#0a0a0a] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{t("profile.fightRecord")}</p>
          <p className="mt-2 text-3xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
            {wins}<span className="text-lg text-white/50">W</span> {losses}<span className="text-lg text-white/50">L</span>
          </p>
          <p className="mt-1 text-xs text-white/50">{winRate}%</p>
        </div>

        <div className="gold-hover rounded-xl border border-white/[0.05] bg-[#0a0a0a] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{t("profile.score")}</p>
          <p className="mt-2 text-3xl font-black text-[#ffba3c]" style={{ fontFamily: "var(--font-display)" }}>
            {user?.score ?? 0}
          </p>
          <p className="mt-1 text-xs text-white/50">{t("prediction.points")}</p>
        </div>

        <div className="gold-hover rounded-xl border border-[#ffba3c]/10 bg-[#ffba3c]/[0.03] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffba3c]/80">{t("profile.ranking")}</p>
          <p className="mt-2 text-3xl font-black text-[#ffba3c]" style={{ fontFamily: "var(--font-display)" }}>
            #{rank}
          </p>
          <p className="mt-1 text-xs text-white/50">{t("common.of")} {totalUsers ?? 0}</p>
        </div>

        <div className="gold-hover rounded-xl border border-white/[0.05] bg-[#0a0a0a] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{t("profile.hallOfFame")}</p>
          <p className="mt-2 text-3xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
            {user?.hall_of_fame_count ?? 0}
          </p>
        </div>
      </div>

      {/* ── Streak Comparison ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="gold-hover rounded-xl border border-white/[0.05] bg-[#0a0a0a] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{t("profile.currentStreak")}</p>
          <p className="mt-3 text-4xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
            {user?.current_streak ?? 0}<span className="text-base text-white/50 ml-1">{t("common.wins")}</span>
          </p>
        </div>
        <div className="gold-hover rounded-xl border border-white/[0.05] bg-[#0a0a0a] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{t("profile.bestStreak")}</p>
          <p className="mt-3 text-4xl font-black text-[#ffba3c]" style={{ fontFamily: "var(--font-display)" }}>
            {user?.best_streak ?? 0}<span className="text-base text-white/50 ml-1">wins</span>
          </p>
        </div>
      </div>

      {/* ── Recent Predictions ── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-6 bg-[#ffba3c]/30" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffba3c]">
            {t("profile.recentPredictions")}
          </h2>
        </div>

        <div className="space-y-2">
          {(recentPreds ?? []).length === 0 ? (
            <div className="rounded-xl border border-white/[0.04] p-8 text-center">
              <p className="text-sm text-white/50">{t("common.noData")}</p>
              <Link href="/events" className="mt-3 inline-block text-xs font-bold text-[#ffba3c] underline underline-offset-2">
                Start predicting
              </Link>
            </div>
          ) : (
            (recentPreds ?? []).map((pred: any) => {
              const fight = pred.fight;
              if (!fight) return null;
              const pickedName = pred.winner_id === fight.fighter_a?.id
                ? (fight.fighter_a?.ring_name || fight.fighter_a?.name)
                : (fight.fighter_b?.ring_name || fight.fighter_b?.name);

              return (
                <Link
                  key={pred.id}
                  href={`/events/${fight.event?.id || ""}`}
                  className="group flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.01] p-4 transition hover:border-white/8"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase tracking-wider text-white/50">
                      {fight.event?.name} · {fight.event?.date}
                    </p>
                    <p className="mt-1 text-sm font-bold text-white/70">
                      {fight.fighter_a?.ring_name || fight.fighter_a?.name} vs {fight.fighter_b?.ring_name || fight.fighter_b?.name}
                    </p>
                    <p className="mt-0.5 text-xs text-white/50">
                      {t("prediction.yourPick")}: <span className="font-medium text-white/70">{pickedName}</span>
                      {pred.method && ` · ${pred.method}`}
                      {pred.round && ` · R${pred.round}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {pred.is_winner_correct === null ? (
                      <span className="rounded border border-white/8 px-2 py-1 text-[10px] font-bold text-white/50">{t("common.pending")}</span>
                    ) : pred.is_winner_correct ? (
                      <div>
                        <span className="rounded border border-[#ffba3c]/20 bg-[#ffba3c]/10 px-2 py-1 text-[10px] font-bold text-[#ffba3c]">{t("event.win")}</span>
                        {typeof pred.score === "number" && <p className="mt-1 text-xs font-bold text-[#ffba3c]">+{pred.score}</p>}
                      </div>
                    ) : (
                      <div>
                        <span className="rounded border border-white/8 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/50">{t("event.loss")}</span>
                        {typeof pred.score === "number" && <p className="mt-1 text-xs font-bold text-white/50">{pred.score}</p>}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
