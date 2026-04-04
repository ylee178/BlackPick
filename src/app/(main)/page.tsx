import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";
import { countryCodeToFlag } from "@/lib/flags";

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

  const [
    { data: events },
    { count: fighterCount },
    { data: topUsers },
    { data: recentCompleted },
  ] = await Promise.all([
    supabase.from("events").select("id, name, date, status, series_type").order("date", { ascending: false }),
    supabase.from("fighters").select("*", { count: "exact", head: true }),
    supabase.from("users").select("ring_name, score, wins, losses").order("score", { ascending: false }).limit(3),
    supabase.from("events").select("id, name, date, series_type").eq("status", "completed").order("date", { ascending: false }).limit(3),
  ]);

  const allEvents = events ?? [];
  const upcomingEvents = allEvents.filter((e) => e.status === "upcoming" || e.status === "live");
  const featured = upcomingEvents[0] ?? null;
  const totalFights = allEvents.length > 0 ? 383 : 0; // from crawl data

  return (
    <div className="space-y-6">

      {/* ═══ ROW 1: Hero (8col) + Ranking (4col) ═══ */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">

        {/* ── A: Next Event Hero ── */}
        <div className="premium-card relative overflow-hidden rounded-2xl p-6 md:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffba3c]/30 to-transparent" />
          <div className="gold-triangle absolute -right-6 -top-2 opacity-30" />

          <div className="relative space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-[#ffba3c]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffba3c]">
                {t("home.platformLabel")}
              </span>
            </div>

            <h1
              className="text-4xl font-black uppercase leading-[0.92] text-white md:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("home.heroTitle")}
            </h1>

            <p className="max-w-md text-sm leading-relaxed text-white/60">
              {t("home.heroDescription")}
            </p>

            {featured && (
              <div className="rounded-xl border border-[#ffba3c]/12 bg-[#ffba3c]/[0.03] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#ffba3c]/80">
                      Next Event
                    </p>
                    <p
                      className="mt-1 text-xl font-black uppercase text-white md:text-2xl"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {featured.name}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {featured.date} · {getSeriesLabel(featured.series_type, t)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded border border-[#ffba3c]/25 bg-[#ffba3c]/10 px-3 py-1.5 text-sm font-black text-[#ffba3c]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {getDDay(featured.date)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link
                href={featured ? `/events/${featured.id}` : "#"}
                className="rounded-lg bg-[#ffba3c] px-7 py-3 text-sm font-bold uppercase tracking-wider text-black transition hover:bg-[#ffd06b]"
              >
                {t("event.makeYourPick")}
              </Link>
              <Link
                href="/ranking"
                className="rounded-lg border border-[#ffba3c]/20 px-7 py-3 text-sm font-medium uppercase tracking-wider text-[#ffba3c]/70 transition hover:border-[#ffba3c]/40 hover:text-[#ffba3c]"
              >
                {t("nav.ranking")}
              </Link>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 h-10 w-10 border-b border-r border-[#ffba3c]/10" />
        </div>

        {/* ── B: Top 3 Ranking ── */}
        <div className="gold-hover rounded-2xl border border-white/[0.05] bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#ffba3c]">
              {t("rankingPage.title")}
            </span>
            <Link href="/ranking" className="text-[10px] uppercase tracking-wider text-white/50 hover:text-[#ffba3c] transition">
              View all
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {(topUsers ?? []).length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-white/50">{t("common.noData")}</p>
                <p className="mt-1 text-[10px] text-white/45">{t("common.startPredicting")}</p>
              </div>
            ) : (
              (topUsers ?? []).map((user: any, i: number) => {
                const rankColor = i === 0 ? "text-[#ffba3c]" : i === 1 ? "text-white/60" : "text-[#cd7f32]";
                return (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.01] p-3">
                    <span
                      className={`w-8 text-center text-lg font-black ${rankColor}`}
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{user.ring_name}</p>
                      <p className="text-[10px] text-white/50">{user.wins}W-{user.losses}L</p>
                    </div>
                    <span
                      className="text-sm font-black text-[#ffba3c]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {user.score}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ═══ ROW 2: Stats (3col) + Recent Results (5col) + Ticket CTA (4col) ═══ */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr_1fr]">

        {/* ── C: Platform Stats ── */}
        <div className="gold-hover rounded-2xl border border-white/[0.05] bg-[#0a0a0a] p-5">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
            Platform
          </span>
          <div className="mt-5 space-y-5">
            <div>
              <p
                className="text-3xl font-black text-[#ffba3c]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {allEvents.length}
              </p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50">{t("nav.events")}</p>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div>
              <p
                className="text-3xl font-black text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {fighterCount ?? 335}
              </p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50">{t("common.fighters")}</p>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div>
              <p
                className="text-3xl font-black text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {totalFights}+
              </p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50">{t("event.fights")}</p>
            </div>
          </div>
        </div>

        {/* ── D: Recent Completed Events ── */}
        <div className="gold-hover rounded-2xl border border-white/[0.05] bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
              {t("event.completed")}
            </span>
            <span className="text-[10px] text-white/45">{t("common.latestResults")}</span>
          </div>

          <div className="mt-5 space-y-3">
            {(recentCompleted ?? []).map((ev: any) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="group flex items-center justify-between rounded-lg border border-white/[0.03] bg-white/[0.01] p-4 transition hover:border-[#ffba3c]/15"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white/70 group-hover:text-white transition">
                    {ev.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/50">
                    {ev.date} · {getSeriesLabel(ev.series_type, t)}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase text-[#ffba3c]/70">
                  {t("event.result")}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── E: Ticket & Membership CTA ── */}
        <div className="flex flex-col gap-4">
          <a
            href="https://hegemonyblack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="gold-hover flex-1 rounded-2xl border border-[#ffba3c]/15 bg-[#ffba3c]/[0.03] p-5 transition"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffba3c]">
              Tickets
            </span>
            <p className="mt-3 text-sm font-bold text-white">
              Black Combat Tickets
            </p>
            <p className="mt-1 text-[11px] text-white/50">
              Get your seats for the next event
            </p>
            <span className="mt-3 inline-block text-xs font-bold text-[#ffba3c] underline underline-offset-2">
              Buy Tickets
            </span>
          </a>

          <a
            href="https://www.youtube.com/@BlackCombat"
            target="_blank"
            rel="noopener noreferrer"
            className="gold-hover flex-1 rounded-2xl border border-white/[0.05] bg-[#0a0a0a] p-5 transition"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              Membership
            </span>
            <p className="mt-3 text-sm font-bold text-white">
              Black Combat YouTube
            </p>
            <p className="mt-1 text-[11px] text-white/50">
              Join membership for full fight replays
            </p>
            <span className="mt-3 inline-block text-xs font-bold text-white/60 underline underline-offset-2">
              Join Now
            </span>
          </a>
        </div>
      </div>

      {/* ═══ Divider ═══ */}
      <div className="gold-line" />

      {/* ═══ ROW 3: Upcoming Events List ═══ */}
      {upcomingEvents.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-6 bg-[#ffba3c]/30" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffba3c]">
              {t("event.upcoming")} {t("nav.events")}
            </h2>
          </div>
          <div className="grid gap-3">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="gold-hover group flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.01] p-5 transition"
              >
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#ffba3c]/70">
                    {getSeriesLabel(event.series_type, t)}
                  </p>
                  <p className="mt-1 text-lg font-bold text-white group-hover:text-[#ffba3c] transition">
                    {event.name}
                  </p>
                  <p className="mt-1 text-xs text-white/50">{event.date}</p>
                </div>
                <span
                  className="rounded border border-[#ffba3c]/15 bg-[#ffba3c]/8 px-3 py-1.5 text-xs font-bold text-[#ffba3c]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {getDDay(event.date)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ ROW 4: Completed Events (compact) ═══ */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-6 bg-white/10" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">
            {t("event.completed")} {t("nav.events")}
          </h2>
        </div>
        <div className="grid gap-2">
          {allEvents.filter((e) => e.status === "completed").slice(0, 10).map((event) => (
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
