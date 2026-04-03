import FightCard from "@/components/FightCard";
import MvpVoteSection from "@/components/MvpVoteSection";
import EventStatusBadge from "@/components/EventStatusBadge";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getSeriesLabel } from "@/lib/constants";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServer();
  const user = await getUser();
  const { id } = await params;

  const { data: event } = await supabase
    .from("events")
    .select("id, name, date, status, mvp_video_url, series_type")
    .eq("id", id)
    .single();

  if (!event) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-gray-300">
        Event not found.
      </div>
    );
  }

  const { data: fights } = await supabase
    .from("fights")
    .select(`
      *,
      fighter_a:fighters!fights_fighter_a_id_fkey(*),
      fighter_b:fighters!fights_fighter_b_id_fkey(*)
    `)
    .eq("event_id", id)
    .order("start_time", { ascending: true });

  const fightIds = (fights ?? []).map((fight) => fight.id);

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
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
              {getSeriesLabel(event.series_type)}
            </p>
            <h1 className="mt-2 text-2xl font-black text-white">{event.name}</h1>
            <p className="mt-2 text-sm text-gray-400">{event.date}</p>
          </div>
          <EventStatusBadge status={event.status as "upcoming" | "live" | "completed"} />
        </div>

        {event.status === "upcoming" && (
          <p className="mt-4 text-sm text-gray-300">
            Predictions are open until each fight starts. Crowd percentages are visible,
            but individual picks stay private.
          </p>
        )}

        {event.status === "live" && (
          <p className="mt-4 text-sm text-gray-300">
            Predictions are locked. All picks are now public.
          </p>
        )}

        {event.status === "completed" && (
          <p className="mt-4 text-sm text-gray-300">
            Results are in. Review your picks, scores, and vote for the event MVP.
          </p>
        )}
      </section>

      {event.status === "completed" && event.mvp_video_url && (
        <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 px-4 py-3">
            <h2 className="font-bold text-white">MVP Highlight</h2>
          </div>
          <div className="aspect-video w-full">
            <iframe
              src={event.mvp_video_url}
              title="MVP Highlight Video"
              className="h-full w-full"
              allowFullScreen
            />
          </div>
        </section>
      )}

      <section className="space-y-4">
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
    </div>
  );
}
