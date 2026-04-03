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
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-[#ffba3c]/20 bg-black p-8 md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,186,60,0.08),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffba3c]/40 to-transparent" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffba3c]">
              {t("home.platformLabel")}
            </p>
            <h1
              className="text-4xl font-black uppercase leading-[0.95] text-white md:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("home.heroTitle")}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/60">
              {t("home.heroDescription")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={featured ? `/events/${featured.id}` : "#"}
                className="rounded-lg bg-[#ffba3c] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#ffc85c]"
              >
                {t("prediction.savePick") || "Predict Now"}
              </Link>
              <Link
                href="/ranking"
                className="rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-white/80 transition hover:border-[#ffba3c]/40 hover:text-white"
              >
                {t("nav.ranking")}
              </Link>
            </div>
          </div>

          {/* Next Event Card */}
          {featured && (
            <div className="rounded-2xl border border-[#ffba3c]/15 bg-white/[0.03] p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffba3c]">
                Next Event
              </p>
              <h2
                className="mt-3 text-2xl font-black uppercase text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {featured.name}
              </h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                  {featured.date}
                </span>
                <span className="rounded-md border border-[#ffba3c]/20 bg-[#ffba3c]/10 px-3 py-1.5 text-xs font-bold text-[#ffba3c]">
                  {getDDay(featured.date)}
                </span>
              </div>
              <div className="mt-3 text-xs text-white/40">
                {getSeriesLabel(featured.series_type, t)}
              </div>
              <Link
                href={`/events/${featured.id}`}
                className="mt-5 block rounded-lg bg-[#ffba3c] py-2.5 text-center text-sm font-bold text-black transition hover:bg-[#ffc85c]"
              >
                {t("event.makeYourPick")}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">
            {t("event.upcoming")} {t("nav.events")}
          </h2>
          <div className="grid gap-3">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition hover:border-[#ffba3c]/30"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ffba3c]/70">
                    {getSeriesLabel(event.series_type, t)}
                  </p>
                  <p className="mt-1 font-bold text-white">{event.name}</p>
                  <p className="mt-1 text-xs text-white/40">{event.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-md border border-[#ffba3c]/20 bg-[#ffba3c]/10 px-2.5 py-1 text-[10px] font-bold text-[#ffba3c]">
                    {getDDay(event.date)}
                  </span>
                  {event.status === "live" && (
                    <span className="rounded-md bg-red-500/20 px-2.5 py-1 text-[10px] font-bold text-red-400">
                      LIVE
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Completed Events */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">
          {t("event.completed")} {t("nav.events")}
        </h2>
        <div className="grid gap-3">
          {completedEvents.length === 0 ? (
            <p className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-sm text-white/40">
              {t("common.noData")}
            </p>
          ) : (
            completedEvents.slice(0, 20).map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition hover:border-white/15"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                    {getSeriesLabel(event.series_type, t)}
                  </p>
                  <p className="mt-1 font-bold text-white/80">{event.name}</p>
                  <p className="mt-1 text-xs text-white/30">{event.date}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/20">
                  {t("event.completed")}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
