import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import EventStatusBadge from "@/components/EventStatusBadge";

export default async function HomePage() {
  const supabase = await createSupabaseServer();

  const { data: events } = await supabase
    .from("events")
    .select("id, name, date, status, series_type")
    .order("date", { ascending: true });

  const upcomingEvents = (events ?? []).filter(
    (event) => event.status === "upcoming" || event.status === "live"
  );
  const completedEvents = (events ?? []).filter(
    (event) => event.status === "completed"
  );

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 to-gray-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
          Fight Record Platform
        </p>
        <h1 className="mt-2 text-3xl font-black text-white">
          Pick fights. Build your record.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-gray-300">
          Predict Black Combat fights, track your wins and losses, and compete with
          fans around the world.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
        </div>

        <div className="grid gap-4">
          {upcomingEvents.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400">
              No upcoming events yet.
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-5 transition hover:border-amber-400/50 hover:bg-gray-900/80"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500">
                      {event.series_type.replace("_", " ")}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-white">{event.name}</h3>
                    <p className="mt-2 text-sm text-gray-400">{event.date}</p>
                  </div>
                  <EventStatusBadge status={event.status as "upcoming" | "live" | "completed"} />
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Completed Events</h2>

        <div className="grid gap-4">
          {completedEvents.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400">
              No completed events yet.
            </div>
          ) : (
            completedEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-5 transition hover:border-amber-400/50 hover:bg-gray-900/80"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500">
                      {event.series_type.replace("_", " ")}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-white">{event.name}</h3>
                    <p className="mt-2 text-sm text-gray-400">{event.date}</p>
                  </div>
                  <EventStatusBadge status="completed" />
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
