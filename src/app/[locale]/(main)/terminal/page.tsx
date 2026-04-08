import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";
import CountdownRing from "./CountdownRing";

export const dynamic = "force-dynamic";

export default async function TerminalPage() {
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
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#ffba3c]/25 bg-[#ffba3c]/[0.06]"
        >
          <span className="text-xs font-black text-[#ffba3c]" style={{ fontFamily: "var(--font-display)" }}>BP</span>
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-black bg-[#ffba3c]" />
        </Link>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-6 border-b border-white/[0.05] pb-3">
        <span className="border-b-2 border-[#ffba3c] pb-3 text-sm font-bold text-white">Overview</span>
        <Link href="/events" className="pb-3 text-sm text-white/40 hover:text-white/60 transition">Events</Link>
        <Link href="/ranking" className="pb-3 text-sm text-white/40 hover:text-white/60 transition">{t("nav.ranking")}</Link>
      </div>

      {/* ── Featured Event with Ring ── */}
      {featured && (
        <Link
          href={`/events/${featured.id}`}
          className="group block rounded-[28px] border border-white/[0.06] bg-[#111] p-6 transition hover:border-[#ffba3c]/20"
        >
          <div className="flex items-center justify-between gap-5">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#ffba3c]">
                {t("common.nextEvent")}
              </p>
              <h2
                className="mt-2 text-xl font-black uppercase leading-tight text-white md:text-2xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {featured.name}
              </h2>

              <div className="mt-3 h-0.5 w-10 rounded-full bg-[#ffba3c]" />

              <div className="mt-3 text-sm text-white/45">
                <span className="text-[9px] uppercase tracking-wider text-white/30 mr-2">Status</span>
                {featured.status === "live" ? "Live" : "Standby"} · {getSeriesLabel(featured.series_type, t)}
              </div>
            </div>

            <CountdownRing days={dday} date={featured.date} />
          </div>
        </Link>
      )}

      {/* ── Stats: 2 cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-white/[0.06] bg-[#111] p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/40">{t("nav.events")}</p>
          {/* Mini chart */}
          <div className="mt-4 flex items-end gap-[3px] h-10">
            {[35, 55, 45, 70, 60, 85, 50, 75, 65, 90].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{ height: `${h}%`, background: i >= 7 ? "#ffba3c" : "rgba(255,186,60,0.2)" }}
              />
            ))}
          </div>
          <p className="mt-3 text-3xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
            {(events ?? []).length}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-white/40">Total · {completedCount} {t("event.completed")}</p>
        </div>

        <div className="rounded-[22px] border border-white/[0.06] bg-[#111] p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/40">{t("common.fighters")}</p>
          {/* Energy blocks */}
          <div className="mt-4 flex items-center gap-1.5 h-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`h-5 flex-1 rounded-sm ${i < 5 ? "bg-[#ffba3c]" : "bg-white/[0.06]"}`}
              />
            ))}
          </div>
          <p className="mt-3 text-3xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
            {fighterCount ?? 335}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-white/40">Active roster</p>
        </div>
      </div>

      {/* ── Latest Results ── */}
      <div className="rounded-[28px] border border-white/[0.06] bg-[#111] p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/40">{t("common.latestResults")}</p>
          <Link href="/events" className="text-[9px] uppercase tracking-wider text-white/30 hover:text-[#ffba3c] transition">
            {t("common.viewAll")}
          </Link>
        </div>
        {(recentCompleted ?? []).map((ev: any, i: number) => (
          <Link
            key={ev.id}
            href={`/events/${ev.id}`}
            className="group flex items-center justify-between py-3.5"
            style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white/65 group-hover:text-white transition">{ev.name}</p>
              <p className="text-[10px] text-white/30">{ev.date} · {getSeriesLabel(ev.series_type, t)}</p>
            </div>
            <span className="shrink-0 text-white/20 group-hover:text-[#ffba3c] transition">&#x2192;</span>
          </Link>
        ))}
      </div>

      {/* ── Ranking: 2 cards ── */}
      <div className="grid grid-cols-2 gap-3">
        {(topUsers ?? []).length === 0 ? (
          <>
            <div className="rounded-[22px] border border-white/[0.06] bg-[#111] p-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/40">#1 {t("ranking.rank")}</p>
              <p className="mt-4 text-3xl font-black text-white/20" style={{ fontFamily: "var(--font-display)" }}>--</p>
              <p className="text-[9px] text-white/20">Awaiting data</p>
            </div>
            <div className="rounded-[22px] border border-white/[0.06] bg-[#111] p-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/40">#2 {t("ranking.rank")}</p>
              <p className="mt-4 text-3xl font-black text-white/20" style={{ fontFamily: "var(--font-display)" }}>--</p>
              <p className="text-[9px] text-white/20">Awaiting data</p>
            </div>
          </>
        ) : (
          (topUsers ?? []).slice(0, 2).map((user: any, i: number) => (
            <div key={i} className="rounded-[22px] border border-white/[0.06] bg-[#111] p-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/40">
                #{i + 1} {t("ranking.rank")}
              </p>
              <p
                className="mt-4 truncate text-2xl font-black text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {user.ring_name}
              </p>
              <p className="text-sm text-white/40">
                <span className="font-bold text-[#ffba3c]">{user.score}</span> pts · {user.wins}W-{user.losses}L
              </p>
            </div>
          ))
        )}
      </div>

      {/* ── Ticket CTA ── */}
      <a
        href="https://hegemonyblack.com"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-between rounded-[28px] border border-white/[0.06] bg-[#111] p-5 transition hover:border-[#ffba3c]/15"
      >
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/40">{t("common.tickets")}</p>
          <p className="mt-1 text-lg font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
            {t("common.blackCombatTickets")}
          </p>
          <p className="text-xs text-white/40">{t("common.getSeats")}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#ffba3c]/20 bg-[#ffba3c]/[0.06] text-[#ffba3c] group-hover:bg-[#ffba3c]/10 transition">
          &#x25B6;
        </div>
      </a>

      {/* ── Footer ── */}
      <div className="text-center pt-2">
        <Link href="/" className="text-[10px] tracking-wider text-white/30 hover:text-[#ffba3c] transition">
          Switch to Standard View
        </Link>
      </div>
    </div>
  );
}
