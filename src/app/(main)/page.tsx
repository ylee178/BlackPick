import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";
import { getLocalizedEventName } from "@/lib/localized-name";

export const dynamic = "force-dynamic";

function getDDay(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "D-DAY";
  return `D-${days}`;
}

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { t, locale } = await getTranslations();

  const [
    { data: events },
    { count: fighterCount },
    { data: topUsers },
    { data: recentCompleted },
  ] = await Promise.all([
    supabase.from("events").select("id, name, date, status, series_type").order("date", { ascending: false }),
    supabase.from("fighters").select("*", { count: "exact", head: true }),
    supabase.from("users").select("ring_name, score, wins, losses").order("score", { ascending: false }).limit(3),
    supabase.from("events").select("id, name, date, series_type").eq("status", "completed").order("date", { ascending: false }).limit(5),
  ]);

  const allEvents = events ?? [];
  const upcomingEvents = allEvents.filter((e) => e.status === "upcoming" || e.status === "live");
  const featured = upcomingEvents[0] ?? null;

  return (
    <div className="space-y-5">

      {/* ═══ HERO: Bold, energetic, sports-app feel ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0a0a0a]">
        {/* Dot pattern background */}
        <div className="dot-pattern absolute inset-0 opacity-60" />
        {/* Diagonal stripe overlay */}
        <div className="stripe-accent absolute inset-0" />

        <div className="relative grid gap-0 lg:grid-cols-[1.3fr_1fr]">
          {/* Left: headline */}
          <div className="p-8 md:p-12 lg:p-14">
            <div className="inline-block skew-divider mb-6 w-16" />

            <h1
              className="text-6xl font-black uppercase leading-[0.85] text-white md:text-7xl lg:text-8xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Black
              <br />
              <span className="text-[#ffba3c]">Pick</span>
            </h1>

            <p className="mt-4 text-lg font-bold italic text-white/60">
              {t("home.heroTitle")}
            </p>

            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50">
              {t("home.heroDescription")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={featured ? `/events/${featured.id}` : "/events"}
                className="rounded-lg bg-[#ffba3c] px-8 py-3.5 text-sm font-black uppercase tracking-wider text-black transition hover:bg-[#ffd06b] hover:scale-[1.02] active:scale-[0.98]"
              >
                {t("event.makeYourPick")}
              </Link>
              <Link
                href="/ranking"
                className="rounded-lg border-2 border-[#ffba3c] px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-[#ffba3c] transition hover:bg-[#ffba3c] hover:text-black"
              >
                {t("nav.ranking")}
              </Link>
            </div>
          </div>

          {/* Right: Next Event card (gold block) */}
          {featured && (
            <div className="gold-block relative overflow-hidden p-8 md:p-10 lg:rounded-r-3xl">
              {/* Dot overlay on gold */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }} />

              <div className="relative">
                <p
                  className="text-xs font-black uppercase tracking-[0.3em] text-black/50"
                >
                  {t("common.nextEvent")}
                </p>

                <h2
                  className="mt-4 text-4xl font-black uppercase leading-[0.9] text-black md:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {getLocalizedEventName(featured, locale, featured.name)}
                </h2>

                <div className="mt-5 flex items-center gap-3">
                  <span className="rounded-md bg-black/10 px-4 py-2 text-sm font-bold text-black">
                    {featured.date}
                  </span>
                  <span
                    className="rounded-md bg-black px-4 py-2 text-sm font-black text-[#ffba3c]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {getDDay(featured.date)}
                  </span>
                </div>

                <p className="mt-3 text-sm font-medium text-black/50">
                  {getSeriesLabel(featured.series_type, t)}
                </p>

                <Link
                  href={`/events/${featured.id}`}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-black px-6 py-3 text-sm font-black uppercase tracking-wider text-[#ffba3c] transition hover:bg-black/80"
                >
                  {t("event.makeYourPick")}
                  <span className="text-lg">&#x2197;</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ STATS BAR: Bold numbers ═══ */}
      <div className="grid grid-cols-3 gap-3">
        <div className="dot-pattern-light rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5 text-center">
          <p
            className="text-4xl font-black text-[#ffba3c] md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {allEvents.length}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
            {t("nav.events")}
          </p>
        </div>
        <div className="dot-pattern-light rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5 text-center">
          <p
            className="text-4xl font-black text-white md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {fighterCount ?? 335}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
            {t("common.fighters")}
          </p>
        </div>
        <div className="dot-pattern-light rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5 text-center">
          <p
            className="text-4xl font-black text-white md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            383<span className="text-xl text-white/50">+</span>
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
            {t("event.fights")}
          </p>
        </div>
      </div>

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
            <div className="py-6 text-center text-sm text-white/50">
              {t("common.noData")}
            </div>
          ) : (
            <div className="space-y-3">
              {(topUsers ?? []).map((user: any, i: number) => {
                const colors = ["text-[#ffba3c]", "text-white/70", "text-[#cd7f32]"];
                return (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5">
                    <span
                      className={`w-8 text-center text-2xl font-black ${colors[i]}`}
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold uppercase text-white">{user.ring_name}</p>
                      <p className="text-[10px] text-white/50">{user.wins}W-{user.losses}L</p>
                    </div>
                    <span
                      className="text-lg font-black text-[#ffba3c]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {user.score}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Completed */}
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
                  <p className="truncate font-bold text-white/70 group-hover:text-white transition">
                    {getLocalizedEventName(ev, locale, ev.name)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/50">
                    {ev.date} · {getSeriesLabel(ev.series_type, t)}
                  </p>
                </div>
                <span className="shrink-0 rounded bg-[#ffba3c]/10 px-2.5 py-1 text-[10px] font-bold text-[#ffba3c]/80">
                  {t("event.result")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TICKET + MEMBERSHIP CTA (gold accent bar) ═══ */}
      <div className="grid gap-3 md:grid-cols-2">
        <a
          href="https://hegemonyblack.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative overflow-hidden rounded-2xl bg-[#ffba3c] p-6 transition hover:bg-[#ffd06b]"
        >
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
            backgroundSize: "12px 12px",
          }} />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/50">
              {t("common.tickets")}
            </p>
            <p
              className="mt-2 text-2xl font-black uppercase text-black"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("common.blackCombatTickets")}
            </p>
            <p className="mt-1 text-sm text-black/60">{t("common.getSeats")}</p>
            <span className="mt-3 inline-block text-sm font-black text-black/80 underline underline-offset-4 group-hover:text-black">
              {t("common.buyTickets")} &#x2197;
            </span>
          </div>
        </a>

        <a
          href="https://www.youtube.com/@BlackCombat"
          target="_blank"
          rel="noopener noreferrer"
          className="gold-hover rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-6 transition"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">
            {t("common.membership")}
          </p>
          <p
            className="mt-2 text-2xl font-black uppercase text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("common.blackCombatYoutube")}
          </p>
          <p className="mt-1 text-sm text-white/50">{t("common.joinMembership")}</p>
          <span className="mt-3 inline-block text-sm font-bold text-[#ffba3c] underline underline-offset-4">
            {t("common.joinNow")} &#x2197;
          </span>
        </a>
      </div>

      {/* ═══ UPCOMING EVENTS ═══ */}
      {upcomingEvents.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="skew-divider w-8" />
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-[#ffba3c]">
              {t("event.upcoming")} {t("nav.events")}
            </h2>
          </div>
          <div className="grid gap-3">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="gold-hover group flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#0a0a0a] p-5 transition"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ffba3c]/70">
                    {getSeriesLabel(event.series_type, t)}
                  </p>
                  <p className="mt-1 text-lg font-black uppercase text-white group-hover:text-[#ffba3c] transition">
                    {getLocalizedEventName(event, locale, event.name)}
                  </p>
                  <p className="mt-1 text-xs text-white/50">{event.date}</p>
                </div>
                <span
                  className="rounded-lg bg-[#ffba3c] px-3 py-1.5 text-xs font-black text-black"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {getDDay(event.date)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ COMPLETED (compact) ═══ */}
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
                <p className="text-[9px] uppercase tracking-wider text-white/45">
                  {getSeriesLabel(event.series_type, t)}
                </p>
                <p className="mt-0.5 text-sm font-medium text-white/55 group-hover:text-white/80 transition">
                  {getLocalizedEventName(event, locale, event.name)}
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
