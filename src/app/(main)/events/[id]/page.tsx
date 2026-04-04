import FightCard from "@/components/FightCard";
import MvpVoteSection from "@/components/MvpVoteSection";
import CountdownTimer from "@/components/CountdownTimer";
import StickyEventHeader from "@/components/StickyEventHeader";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getSeriesLabel } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedEventName } from "@/lib/localized-name";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServer();
  const user = await getUser();
  const { id } = await params;
  const { t, locale } = await getTranslations();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, date, status, mvp_video_url, series_type")
    .eq("id", id)
    .single();

  if (!event) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-8 text-center text-white/55">
        {t("event.notFound")}
      </div>
    );
  }

  const { data: fights } = await supabase
    .from("fights")
    .select(`
      id, event_id, fighter_a_id, fighter_b_id, start_time, status, winner_id, method, round,
      fighter_a:fighters!fighter_a_id(*),
      fighter_b:fighters!fighter_b_id(*)
    `)
    .eq("event_id", id)
    .order("start_time", { ascending: true });

  const fightIds = (fights ?? []).map((f) => f.id);
  const earliestStart = fights && fights.length > 0
    ? [...fights].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0].start_time
    : null;

  const [{ data: predictions }, { data: statsData }] = await Promise.all([
    user && fightIds.length > 0
      ? supabase.from("predictions").select("*").eq("user_id", user.id).in("fight_id", fightIds)
      : Promise.resolve({ data: [] as any[] }),
    fightIds.length > 0
      ? supabase.from("predictions").select("fight_id, winner_id").in("fight_id", fightIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const predMap = new Map((predictions ?? []).map((p: any) => [p.fight_id, p]));

  const statsMap = new Map<string, { fighter_a_percentage: number; fighter_b_percentage: number; total_predictions: number }>();
  for (const fight of fights ?? []) {
    const fp = (statsData ?? []).filter((p: any) => p.fight_id === fight.id);
    const total = fp.length;
    const aCount = fp.filter((p: any) => p.winner_id === fight.fighter_a_id).length;
    statsMap.set(fight.id, {
      fighter_a_percentage: total > 0 ? Math.round((aCount / total) * 100) : 0,
      fighter_b_percentage: total > 0 ? Math.round(((total - aCount) / total) * 100) : 0,
      total_predictions: total,
    });
  }

  const eventFighterMap = new Map<string, any>();
  for (const fight of fights ?? []) {
    if ((fight as any).fighter_a) eventFighterMap.set((fight as any).fighter_a.id, (fight as any).fighter_a);
    if ((fight as any).fighter_b) eventFighterMap.set((fight as any).fighter_b.id, (fight as any).fighter_b);
  }

  const fightCount = (fights ?? []).length;
  const completedCount = (fights ?? []).filter((f) => f.status === "completed").length;
  const withWinner = (fights ?? []).filter((f) => f.winner_id).length;
  const nowTimestamp = Date.now();
  const localizedEventName = getLocalizedEventName(event, locale, event.name);

  return (
    <div className="relative space-y-8 pb-24">
      <StickyEventHeader
        eventName={localizedEventName}
        eventStatus={event.status as "upcoming" | "live" | "completed"}
        countdownTargetTime={event.status === "upcoming" ? earliestStart : null}
        watchElementId="event-page-header"
      />

      {/* ── Header ── */}
      <section
        id="event-page-header"
        className="premium-card relative overflow-hidden rounded-2xl p-6 md:p-8"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffba3c]/25 to-transparent" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left: Event info */}
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded border border-[#ffba3c]/20 bg-[#ffba3c]/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffba3c]">
                {getSeriesLabel(event.series_type, t)}
              </span>
              <span className={`rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${
                event.status === "live"
                  ? "border-red-500/20 bg-red-500/10 text-red-400"
                  : event.status === "completed"
                    ? "border-[#ffba3c]/15 text-[#ffba3c]/80"
                    : "border-white/8 text-white/60"
              }`}>
                {t(`event.${event.status}`)}
              </span>
            </div>

            <h1
              className="mt-5 text-3xl font-black uppercase leading-tight text-white md:text-4xl lg:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {localizedEventName}
            </h1>

            <p className="mt-3 text-sm text-white/55">{event.date}</p>

            {event.status === "upcoming" && (
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/55">
                {t("event.upcomingDescription")}
              </p>
            )}
            {event.status === "live" && (
              <p className="mt-4 text-sm text-white/55">{t("event.liveDescription")}</p>
            )}
            {event.status === "completed" && (
              <p className="mt-4 text-sm text-white/55">{t("event.completedDescription")}</p>
            )}
          </div>

          {/* Right: Stats panel */}
          <div className="space-y-4">
            {event.status === "upcoming" && earliestStart && (
              <CountdownTimer targetTime={earliestStart} />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.05] bg-black p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">{t("event.totalFights")}</p>
                <p
                  className="mt-2 text-3xl font-black text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {fightCount}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-black p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">{t("event.result")}</p>
                <p
                  className="mt-2 text-3xl font-black text-[#ffba3c]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {withWinner}/{completedCount}
                </p>
              </div>
            </div>

            {/* Decorative corners */}
            <div className="absolute bottom-4 right-4 hidden h-10 w-10 border-b border-r border-[#ffba3c]/10 lg:block" />
          </div>
        </div>
      </section>

      {/* ── MVP Video ── */}
      {event.status === "completed" && event.mvp_video_url && (
        <section className="overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a]">
          <div className="border-b border-white/5 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#ffba3c]">
              {t("event.mvpHighlight")}
            </h2>
          </div>
          <div className="aspect-video w-full bg-black">
            <iframe
              src={event.mvp_video_url}
              title={t("event.mvpHighlightVideo")}
              className="h-full w-full"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>
      )}

      {/* ── Fight Card List ── */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-px w-6 bg-[#ffba3c]/30" />
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#ffba3c]">
              {t("event.fightCard")}
            </h2>
          </div>
          <span
            className="text-sm font-bold text-white/50"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {fightCount} {t("event.fights")}
          </span>
        </div>

        <div className="space-y-4">
          {(fights ?? []).map((fight) => (
            <FightCard
              key={fight.id}
              fight={fight as any}
              eventStatus={event.status as "upcoming" | "live" | "completed"}
              hasStarted={new Date(fight.start_time).getTime() <= nowTimestamp}
              prediction={predMap.get(fight.id) ?? null}
              crowdStats={statsMap.get(fight.id) ?? null}
              currentUserId={user?.id ?? null}
            />
          ))}
        </div>
      </section>

      {/* ── MVP Vote ── */}
      {event.status === "completed" && (
        <MvpVoteSection
          eventId={event.id}
          eventDate={event.date}
          fighters={Array.from(eventFighterMap.values())}
        />
      )}
    </div>
  );
}
