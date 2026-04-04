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

  const { data: events } = await supabase
    .from("events")
    .select("id, name, date, status, series_type")
    .order("date", { ascending: false });

  const upcomingEvents = (events ?? []).filter(
    (e) => e.status === "upcoming" || e.status === "live"
  );
  const completedEvents = (events ?? []).filter(
    (e) => e.status === "completed"
  );
  const featured = upcomingEvents[0] ?? null;

  return (
    <div className="space-y-16">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Gold triangle decoration */}
        <div className="gold-triangle absolute -right-8 -top-4 opacity-40" />
        <div className="gold-triangle absolute right-20 top-16 scale-50 opacity-20" />

        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          {/* Left: Copy */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-4">
                <div className="h-px w-10 bg-[#ffba3c]" />
                <span className="text-xs font-medium uppercase tracking-[0.35em] text-[#ffba3c]">
                  {t("home.platformLabel")}
                </span>
              </div>

              <h1
                className="mt-6 text-5xl font-black uppercase leading-[0.92] text-white md:text-6xl lg:text-7xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Black<br />
                <span className="text-[#ffba3c]">Pick</span>
              </h1>

              <p className="mt-4 text-lg font-medium italic text-white/50">
                {t("home.heroTitle")}
              </p>

              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/40">
                {t("home.heroDescription")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={featured ? `/events/${featured.id}` : "#"}
                className="group relative overflow-hidden rounded bg-[#ffba3c] px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition hover:bg-[#ffd06b]"
              >
                <span className="relative z-10">{t("event.makeYourPick")}</span>
              </Link>
              <Link
                href="/ranking"
                className="flex items-center gap-2 rounded border border-[#ffba3c]/20 px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-[#ffba3c]/80 transition hover:border-[#ffba3c]/40 hover:text-[#ffba3c]"
              >
                {t("nav.ranking")}
              </Link>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-8 border-t border-white/5 pt-6">
              <div>
                <p
                  className="text-2xl font-black text-[#ffba3c]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {(events ?? []).length}
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                  {t("nav.events")}
                </p>
              </div>
              <div className="h-8 w-px bg-white/8" />
              <div>
                <p
                  className="text-2xl font-black text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  335+
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                  Fighters
                </p>
              </div>
              <div className="h-8 w-px bg-white/8" />
              <div>
                <p
                  className="text-2xl font-black text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  383+
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                  {t("event.fights")}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Next Event Card */}
          {featured && (
            <div className="premium-card relative overflow-hidden rounded-2xl p-8">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffba3c]/30 to-transparent" />

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-[#ffba3c]/20 to-transparent" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffba3c]">
                  Next Event
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-[#ffba3c]/20 to-transparent" />
              </div>

              <h2
                className="mt-6 text-center text-3xl font-black uppercase leading-tight text-white md:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {featured.name}
              </h2>

              <div className="mt-6 flex items-center justify-center gap-4">
                <span className="rounded border border-white/8 bg-white/[0.03] px-4 py-2 text-sm text-white/50">
                  {featured.date}
                </span>
                <span
                  className="rounded border border-[#ffba3c]/20 bg-[#ffba3c]/10 px-4 py-2 text-sm font-bold text-[#ffba3c]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {getDDay(featured.date)}
                </span>
              </div>

              <p className="mt-3 text-center text-xs text-white/30">
                {getSeriesLabel(featured.series_type, t)}
              </p>

              <Link
                href={`/events/${featured.id}`}
                className="mt-8 block rounded bg-[#ffba3c] py-3 text-center text-sm font-bold uppercase tracking-wider text-black transition hover:bg-[#ffd06b]"
              >
                {t("event.makeYourPick")}
              </Link>

              {/* Decorative corner */}
              <div className="absolute bottom-4 right-4 h-12 w-12 border-b border-r border-[#ffba3c]/15" />
              <div className="absolute left-4 top-12 h-12 w-12 border-l border-t border-[#ffba3c]/15" />
            </div>
          )}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="gold-line" />

      {/* ── Upcoming Events ── */}
      {upcomingEvents.length > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px w-8 bg-[#ffba3c]/40" />
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#ffba3c]">
              {t("event.upcoming")} {t("nav.events")}
            </h2>
          </div>
          <div className="grid gap-4">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="gold-hover group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.01] p-6 transition"
              >
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#ffba3c]/50">
                    {getSeriesLabel(event.series_type, t)}
                  </p>
                  <p className="mt-1.5 text-lg font-bold text-white group-hover:text-[#ffba3c] transition">
                    {event.name}
                  </p>
                  <p className="mt-1 text-xs text-white/30">{event.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="rounded border border-[#ffba3c]/15 bg-[#ffba3c]/8 px-3 py-1.5 text-xs font-bold text-[#ffba3c]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {getDDay(event.date)}
                  </span>
                  {event.status === "live" && (
                    <span className="flex items-center gap-1.5 rounded bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Completed Events ── */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px w-8 bg-white/15" />
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">
            {t("event.completed")} {t("nav.events")}
          </h2>
        </div>
        <div className="grid gap-3">
          {completedEvents.length === 0 ? (
            <p className="rounded-xl border border-white/5 p-8 text-center text-sm text-white/20">
              {t("common.noData")}
            </p>
          ) : (
            completedEvents.slice(0, 15).map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group flex items-center justify-between rounded-lg border border-white/[0.03] p-5 transition hover:border-white/10"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/20">
                    {getSeriesLabel(event.series_type, t)}
                  </p>
                  <p className="mt-1 font-medium text-white/50 group-hover:text-white/70 transition">
                    {event.name}
                  </p>
                </div>
                <span className="text-xs text-white/15">{event.date}</span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
