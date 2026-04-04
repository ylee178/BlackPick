import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

function getDDay(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "D-DAY";
  return `D-${days}`;
}

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { t } = await getTranslations();

  const [{ data: events }, { data: topUsers }, { data: recentCompleted }] =
    await Promise.all([
      supabase.from("events").select("id, name, date, status, series_type").order("date", { ascending: false }),
      supabase.from("users").select("ring_name, score, wins, losses").order("score", { ascending: false }).limit(3),
      supabase.from("events").select("id, name, date, series_type").eq("status", "completed").order("date", { ascending: false }).limit(5),
    ]);

  const allEvents = events ?? [];
  const upcomingEvents = allEvents.filter((e) => e.status === "upcoming" || e.status === "live");
  const featured = upcomingEvents[0] ?? null;

  return (
    <div className="space-y-6">

      {/* ═══ HERO: Featured Event ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0a0a0a]">
        <div className="dot-pattern absolute inset-0 opacity-40" />
        <div className="stripe-accent absolute inset-0" />

        <div className="relative p-8 md:p-12">
          <div className="inline-block skew-divider mb-6 w-12" />

          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#ffba3c]">
            {t("home.platformLabel")}
          </p>

          <h1
            className="mt-4 text-5xl font-black uppercase leading-[0.85] text-white md:text-6xl lg:text-7xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("home.heroTitle")}
          </h1>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50">
            {t("home.heroDescription")}
          </p>

          {/* Featured Event Card */}
          {featured && (
            <Link
              href={`/events/${featured.id}`}
              className="mt-8 block max-w-lg rounded-2xl border border-[#ffba3c]/25 bg-[#ffba3c]/[0.06] p-6 transition hover:border-[#ffba3c]/40 hover:bg-[#ffba3c]/[0.1]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#ffba3c]">
                    {t("common.nextEvent")}
                  </p>
                  <p
                    className="mt-2 text-2xl font-black uppercase text-white md:text-3xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {featured.name}
                  </p>
                  <p className="mt-2 text-xs text-white/50">
                    {featured.date} · {getSeriesLabel(featured.series_type, t)}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-lg bg-[#ffba3c] px-3 py-2 text-sm font-black text-black"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {getDDay(featured.date)}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[#ffba3c]">
                {t("event.makeYourPick")}
                <span>&#x2192;</span>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* ═══ ROW 2: Ranking + Recent Results ═══ */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        {/* Ranking Top 3 */}
        <div className="gold-hover rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="skew-divider w-5" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#ffba3c]">
                {t("rankingPage.title")}
              </span>
            </div>
            <Link href="/ranking" className="text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-[#ffba3c] transition">
              {t("common.viewAll")}
            </Link>
          </div>

          {(topUsers ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-white/50">{t("common.noData")}</div>
          ) : (
            <div className="space-y-3">
              {(topUsers ?? []).map((user: any, i: number) => {
                const colors = ["text-[#ffba3c]", "text-white/70", "text-[#cd7f32]"];
                return (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5">
                    <span className={`w-8 text-center text-2xl font-black ${colors[i]}`} style={{ fontFamily: "var(--font-display)" }}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold uppercase text-white">{user.ring_name}</p>
                      <p className="text-[10px] text-white/50">{user.wins}W-{user.losses}L</p>
                    </div>
                    <span className="text-lg font-black text-[#ffba3c]" style={{ fontFamily: "var(--font-display)" }}>
                      {user.score}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Results */}
        <div className="gold-hover rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="skew-divider w-5" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-white/50">
              {t("common.latestResults")}
            </span>
          </div>
          <div className="space-y-2">
            {(recentCompleted ?? []).map((ev: any) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="group flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 transition hover:border-[#ffba3c]/20"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-white/70 group-hover:text-white transition">{ev.name}</p>
                  <p className="mt-0.5 text-[10px] text-white/50">{ev.date} · {getSeriesLabel(ev.series_type, t)}</p>
                </div>
                <span className="shrink-0 rounded bg-[#ffba3c]/10 px-2.5 py-1 text-[10px] font-bold text-[#ffba3c]/80">
                  {t("event.result")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TICKET + MEMBERSHIP ═══ */}
      <div className="grid gap-3 md:grid-cols-2">
        <a
          href="https://hegemonyblack.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative overflow-hidden rounded-2xl bg-[#ffba3c] p-6 transition hover:bg-[#ffd06b]"
        >
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/50">{t("common.tickets")}</p>
            <p className="mt-2 text-xl font-black uppercase text-black" style={{ fontFamily: "var(--font-display)" }}>
              {t("common.blackCombatTickets")}
            </p>
            <p className="mt-1 text-sm text-black/60">{t("common.getSeats")}</p>
          </div>
        </a>
        <a
          href="https://www.youtube.com/@BlackCombat"
          target="_blank"
          rel="noopener noreferrer"
          className="gold-hover rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-6 transition"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">{t("common.membership")}</p>
          <p className="mt-2 text-xl font-black uppercase text-white" style={{ fontFamily: "var(--font-display)" }}>
            {t("common.blackCombatYoutube")}
          </p>
          <p className="mt-1 text-sm text-white/50">{t("common.joinMembership")}</p>
        </a>
      </div>

      {/* ═══ COMPLETED (compact list only, no duplicates) ═══ */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-0.5 w-6 bg-white/15" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">
            {t("event.completed")} {t("nav.events")}
          </h2>
        </div>
        <div className="grid gap-2">
          {allEvents.filter((e) => e.status === "completed").slice(0, 8).map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group flex items-center justify-between rounded-lg border border-white/[0.03] p-4 transition hover:border-white/8"
            >
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/45">{getSeriesLabel(event.series_type, t)}</p>
                <p className="mt-0.5 text-sm font-medium text-white/55 group-hover:text-white/80 transition">{event.name}</p>
              </div>
              <span className="text-[10px] text-white/45">{event.date}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
