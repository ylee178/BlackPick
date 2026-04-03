import FightCard from "@/components/FightCard";
import MvpVoteSection from "@/components/MvpVoteSection";
import EventStatusBadge from "@/components/EventStatusBadge";
import CountdownTimer from "@/components/CountdownTimer";
import StickyEventHeader from "@/components/StickyEventHeader";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getSeriesLabel } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n-server";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServer();
  const user = await getUser();
  const { id } = await params;
  const { t } = await getTranslations();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, date, status, mvp_video_url, series_type")
    .eq("id", id)
    .single();

  if (!event) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-[#15171A] p-6 text-[#9CA3AF]">
        {t("event.notFound")}
      </div>
    );
  }

  const { data: fights } = await supabase
    .from("fights")
    .select(`
      id,
      event_id,
      fighter_a_id,
      fighter_b_id,
      start_time,
      status,
      winner_id,
      method,
      round,
      fighter_a:fighters!fighter_a_id(*),
      fighter_b:fighters!fighter_b_id(*)
    `)
    .eq("event_id", id)
    .order("start_time", { ascending: true });

  const fightIds = (fights ?? []).map((fight) => fight.id);
  const earliestFightStartTime =
    fights && fights.length > 0
      ? [...fights].sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )[0].start_time
      : null;

  const [{ data: predictions }, { data: statsData }] = await Promise.all([
    user && fightIds.length > 0
      ? supabase
          .from("predictions")
          .select("*")
          .eq("user_id", user.id)
          .in("fight_id", fightIds)
      : Promise.resolve({ data: [] as any[] }),
    fightIds.length > 0
      ? supabase.from("predictions").select("fight_id, winner_id").in("fight_id", fightIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const predictionMap = new Map((predictions ?? []).map((p) => [p.fight_id, p]));

  const statsMap = new Map<
    string,
    {
      fighter_a_percentage: number;
      fighter_b_percentage: number;
      total_predictions: number;
    }
  >();

  for (const fight of fights ?? []) {
    const fightPredictions = (statsData ?? []).filter((p) => p.fight_id === fight.id);
    const total = fightPredictions.length;
    const fighterACount = fightPredictions.filter(
      (p) => p.winner_id === fight.fighter_a_id
    ).length;
    const fighterBCount = fightPredictions.filter(
      (p) => p.winner_id === fight.fighter_b_id
    ).length;

    statsMap.set(fight.id, {
      fighter_a_percentage: total > 0 ? Math.round((fighterACount / total) * 100) : 0,
      fighter_b_percentage: total > 0 ? Math.round((fighterBCount / total) * 100) : 0,
      total_predictions: total,
    });
  }

  const eventFighterMap = new Map<string, any>();
  for (const fight of fights ?? []) {
    if ((fight as any).fighter_a) {
      eventFighterMap.set((fight as any).fighter_a.id, (fight as any).fighter_a);
    }
    if ((fight as any).fighter_b) {
      eventFighterMap.set((fight as any).fighter_b.id, (fight as any).fighter_b);
    }
  }

  const eventFighters = Array.from(eventFighterMap.values());

  return (
    <div className="relative space-y-6 pb-24">
      <StickyEventHeader
        eventName={event.name}
        eventStatus={event.status as "upcoming" | "live" | "completed"}
        countdownTargetTime={event.status === "upcoming" ? earliestFightStartTime : null}
        watchElementId="event-page-header"
      />

      <section
        id="event-page-header"
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#15171A] p-6 md:p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(225,6,0,0.12),transparent_30%,transparent_70%,rgba(201,169,106,0.08))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-white/10 bg-[#0B0B0C] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9A96A]">
                {getSeriesLabel(event.series_type, t)}
              </span>
              <EventStatusBadge status={event.status as "upcoming" | "live" | "completed"} />
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-[#F5F7FA] md:text-5xl">
              {event.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#9CA3AF]">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {event.date}
              </span>
              {earliestFightStartTime && (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {new Date(earliestFightStartTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>

            {event.status === "upcoming" && (
              <p className="mt-5 max-w-2xl text-sm leading-6 text-[#9CA3AF]">
                {t("event.upcomingDescription")}
              </p>
            )}

            {event.status === "live" && (
              <p className="mt-5 max-w-2xl text-sm leading-6 text-[#9CA3AF]">
                {t("event.liveDescription")}
              </p>
            )}

            {event.status === "completed" && (
              <p className="mt-5 max-w-2xl text-sm leading-6 text-[#9CA3AF]">
                {t("event.completedDescription")}
              </p>
            )}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#0B0B0C] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
              {t("event.eventOverview")}
            </p>

            {event.status === "upcoming" && earliestFightStartTime ? (
              <div className="mt-4">
                <CountdownTimer targetTime={earliestFightStartTime} />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/8 bg-[#15171A] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF]">
                    {t("event.status")}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#F5F7FA]">
                    {t(`event.${event.status}`)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#15171A] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF]">
                    {t("event.totalFights")}
                  </p>
                  <p
                    className="mt-2 text-3xl font-black text-[#F5F7FA]"
                    style={{ fontFamily: "Barlow Condensed, Pretendard, sans-serif" }}
                  >
                    {(fights ?? []).length}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {event.status === "completed" && event.mvp_video_url && (
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#15171A]">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-bold text-[#F5F7FA]">{t("event.mvpHighlight")}</h2>
          </div>
          <div className="aspect-video w-full bg-[#0B0B0C]">
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

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
              {t("event.fightCard")}
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#F5F7FA]">
              {t("event.fights")}
            </h2>
          </div>
          <div
            className="rounded-full border border-white/10 bg-[#15171A] px-3 py-1 text-sm text-[#9CA3AF]"
            style={{ fontFamily: "Barlow Condensed, Pretendard, sans-serif" }}
          >
            {(fights ?? []).length}
          </div>
        </div>

        {(fights ?? []).map((fight) => (
          <FightCard
            key={fight.id}
            fight={fight as any}
            eventStatus={event.status as "upcoming" | "live" | "completed"}
            prediction={predictionMap.get(fight.id) ?? null}
            crowdStats={statsMap.get(fight.id) ?? null}
            currentUserId={user?.id ?? null}
          />
        ))}
      </section>

      {event.status === "completed" && (
        <MvpVoteSection
          eventId={event.id}
          eventDate={event.date}
          fighters={eventFighters}
        />
      )}

      {event.status === "upcoming" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0B0B0C]/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
                {t("prediction.bulk")}
              </p>
              <p className="truncate text-sm text-[#F5F7FA]">{event.name}</p>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#E10600] px-5 py-3 text-sm font-semibold text-[#F5F7FA] transition hover:bg-[#c90500]"
            >
              {t("prediction.predictAll")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
