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

export default async function EventsPage() {
  const supabase = await createSupabaseServer();
  const { t } = await getTranslations();

  const { data: events } = await supabase
    .from("events")
    .select("id, name, date, status, series_type")
    .order("date", { ascending: false });

  const upcoming = (events ?? []).filter((e) => e.status === "upcoming" || e.status === "live");
  const completed = (events ?? []).filter((e) => e.status === "completed");

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-[#ffba3c]/40" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffba3c]">
            Black Combat
          </span>
        </div>
        <h1
          className="mt-4 text-3xl font-black uppercase text-white md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          All {t("nav.events")}
        </h1>
      </div>

      {/* Upcoming / Live */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-6 bg-[#ffba3c]/30" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffba3c]">
              {t("event.upcoming")}
            </h2>
          </div>
          <div className="grid gap-3">
            {upcoming.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="gold-hover group flex items-center justify-between rounded-xl border border-[#ffba3c]/10 bg-[#ffba3c]/[0.02] p-5 transition"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ffba3c]/80">
                    {getSeriesLabel(event.series_type, t)}
                  </p>
                  <p className="mt-1 text-lg font-bold text-white group-hover:text-[#ffba3c] transition">
                    {event.name}
                  </p>
                  <p className="mt-1 text-xs text-white/50">{event.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  {event.status === "live" && (
                    <span className="flex items-center gap-1.5 rounded bg-red-500/15 px-2.5 py-1 text-[10px] font-bold text-red-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                      LIVE
                    </span>
                  )}
                  <span
                    className="rounded border border-[#ffba3c]/20 bg-[#ffba3c]/10 px-3 py-1.5 text-xs font-bold text-[#ffba3c]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {getDDay(event.date)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-6 bg-white/10" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">
            {t("event.completed")} ({completed.length})
          </h2>
        </div>
        <div className="grid gap-2">
          {completed.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group flex items-center justify-between rounded-lg border border-white/[0.03] p-4 transition hover:border-white/8"
            >
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/50">
                  {getSeriesLabel(event.series_type, t)}
                </p>
                <p className="mt-0.5 text-sm font-medium text-white/60 group-hover:text-white/60 transition">
                  {event.name}
                </p>
              </div>
              <span className="text-[10px] text-white/45">{event.date}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
