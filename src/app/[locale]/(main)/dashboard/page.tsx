import { Link } from "@/i18n/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";
import CountdownRing from "./CountdownRing";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();
  const { t } = await getTranslations();

  const [{ data: events }, { count: fighterCount }, { data: topUsers }, { data: recentCompleted }] =
    await Promise.all([
      supabase.from("events").select("id, name, date, status, series_type").order("date", { ascending: false }),
      supabase.from("fighters").select("*", { count: "exact", head: true }),
      supabase.from("users").select("ring_name, score, wins, losses, current_streak, best_streak").order("score", { ascending: false }).limit(3),
      supabase.from("events").select("id, name, date, series_type").eq("status", "completed").order("date", { ascending: false }).limit(3),
    ]);

  const upcoming = (events ?? []).filter((e) => e.status === "upcoming" || e.status === "live");
  const featured = upcoming[0] ?? null;
  const dday = featured ? Math.max(0, Math.ceil((new Date(featured.date).getTime() - Date.now()) / 86400000)) : 0;
  const completedCount = (events ?? []).filter((e) => e.status === "completed").length;

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffba3c]/60">System Active</p>
          <h1 className="text-2xl font-black uppercase text-white" style={{ fontFamily: "var(--font-display)" }}>
            Dashboard
          </h1>
        </div>
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffba3c]/20 bg-[#ffba3c]/[0.06] text-xs font-bold text-[#ffba3c]"
        >
          BP
        </Link>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-6 border-b border-white/[0.06] pb-2">
        <span className="border-b-2 border-[#ffba3c] pb-2 text-sm font-bold text-white">Overview</span>
        <Link href="/events" className="pb-2 text-sm text-white/45 transition hover:text-white/70">Events</Link>
        <Link href="/ranking" className="pb-2 text-sm text-white/45 transition hover:text-white/70">{t("nav.ranking")}</Link>
      </div>

      {/* ── Featured Event Card with Ring ── */}
      {featured && (
        <Link
          href={`/events/${featured.id}`}
          className="group block rounded-3xl border border-white/[0.06] bg-[#111] p-6 transition hover:border-[#ffba3c]/20"
        >
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#ffba3c]">
                {t("common.nextEvent")}
              </p>
              <h2
                className="mt-2 truncate text-xl font-black uppercase text-white md:text-2xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {featured.name}
              </h2>

              <div className="mt-3 h-0.5 w-10 bg-[#ffba3c]" />

              <div className="mt-3 flex items-center gap-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">Status</p>
                <p className="text-sm text-white/60">
                  {featured.status === "live" ? "Live" : "Standby"} · {getSeriesLabel(featured.series_type, t)}
                </p>
              </div>
            </div>

            {/* Countdown Ring */}
            <CountdownRing days={dday} date={featured.date} />
          </div>
        </Link>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/45">{t("nav.events")}</p>
          <div className="mt-3 flex items-center gap-3">
            {/* Mini bar chart visual */}
            <div className="flex h-10 items-end gap-0.5">
              {[40, 65, 55, 80, 70, 90, 60].map((h, i) => (
                <div key={i} className="w-1.5 rounded-sm bg-[#ffba3c]/30" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div>
              <p className="text-3xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
                {(events ?? []).length}
              </p>
              <p className="text-[10px] uppercase text-white/45">{t("event.completed")}: {completedCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/45">{t("common.fighters")}</p>
          <div className="mt-3 flex items-center gap-3">
            {/* Energy blocks visual */}
            <div className="flex h-10 items-center gap-1">
              {[true, true, true, true, false, false].map((on, i) => (
                <div key={i} className={`h-4 w-3 rounded-sm ${on ? "bg-[#ffba3c]" : "bg-white/10"}`} />
              ))}
            </div>
            <div>
              <p className="text-3xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
                {fighterCount ?? 335}
              </p>
              <p className="text-[10px] uppercase text-white/45">Active roster</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Latest Results Card ── */}
      <div className="rounded-3xl border border-white/[0.06] bg-[#111] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/45">{t("common.latestResults")}</p>
          <Link href="/events" className="text-[10px] text-white/45 transition hover:text-[#ffba3c]">{t("common.viewAll")}</Link>
        </div>

        {(recentCompleted ?? []).map((ev: any, i: number) => (
          <Link
            key={ev.id}
            href={`/events/${ev.id}`}
            className="group flex items-center justify-between py-3 transition hover:text-[#ffba3c]"
            style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white/70 group-hover:text-white transition">{ev.name}</p>
              <p className="text-[10px] text-white/45">{ev.date}</p>
            </div>
            <span className="shrink-0 text-xs text-white/45 group-hover:text-[#ffba3c] transition">
              &#x2192;
            </span>
          </Link>
        ))}
      </div>

      {/* ── Ranking Row ── */}
      <div className="grid grid-cols-2 gap-3">
        {(topUsers ?? []).slice(0, 2).map((user: any, i: number) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#111] p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/45">
              #{i + 1} {t("ranking.rank")}
            </p>
            <p
              className="mt-3 text-3xl font-black text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {user.ring_name}
            </p>
            <p className="text-sm text-white/45">
              {user.score} <span className="text-[10px]">PTS</span>
            </p>
          </div>
        ))}
      </div>

      {/* ── Ticket CTA ── */}
      <a
        href="https://hegemonyblack.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between rounded-3xl border border-white/[0.06] bg-[#111] p-5 transition hover:border-[#ffba3c]/20"
      >
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/45">{t("common.tickets")}</p>
          <p className="mt-1 text-lg font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
            {t("common.blackCombatTickets")}
          </p>
          <p className="text-xs text-white/45">{t("common.getSeats")}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#ffba3c]/20 bg-[#ffba3c]/[0.06] text-[#ffba3c] transition group-hover:bg-[#ffba3c]/15">
          &#x2197;
        </div>
      </a>

      {/* ── Footer link ── */}
      <div className="text-center">
        <Link href="/" className="text-[10px] tracking-wider text-white/45 underline underline-offset-2 hover:text-[#ffba3c] transition">
          Switch to Standard View
        </Link>
      </div>
    </div>
  );
}
