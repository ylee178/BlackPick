import { requireAdminPage } from "@/lib/admin-auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  RetroEmptyState,
  RetroStatTile,
  RetroStatusBadge,
  retroPanelClassName,
} from "@/components/ui/retro";

type EventStatus = "upcoming" | "live" | "completed" | string;

function statusTone(status: EventStatus): "accent" | "success" | "info" | "neutral" {
  if (status === "live") return "info";
  if (status === "completed") return "success";
  if (status === "upcoming") return "accent";
  return "neutral";
}

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const supabase = createSupabaseAdmin();

  const [
    { count: eventsCount },
    { count: liveEventsCount },
    { count: fightsCount },
    { count: fightersCount },
    { count: predictionsCount },
    { count: usersCount },
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "live"),
    supabase.from("fights").select("*", { count: "exact", head: true }),
    supabase.from("fighters").select("*", { count: "exact", head: true }),
    supabase.from("predictions").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }),
  ]);

  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("id, name, date, status")
    .order("date", { ascending: true })
    .limit(5);

  const stats = [
    { label: "Events", value: eventsCount ?? 0 },
    { label: "Live Events", value: liveEventsCount ?? 0 },
    { label: "Fights", value: fightsCount ?? 0 },
    { label: "Fighters", value: fightersCount ?? 0 },
    { label: "Predictions", value: predictionsCount ?? 0 },
    { label: "Users", value: usersCount ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--bp-ink)] sm:text-3xl">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-[var(--bp-muted)]">
          Overview of platform activity and upcoming events.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((stat) => (
          <RetroStatTile key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </section>

      <section className={retroPanelClassName({ className: "p-5" })}>
        <h2 className="text-xl font-semibold text-[var(--bp-ink)]">Upcoming / Recent Events</h2>
        <div className="mt-4 space-y-3">
          {upcomingEvents?.length ? (
            upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-[12px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--bp-ink)]">{event.name}</p>
                  <p className="text-sm text-[var(--bp-muted)]">{event.date}</p>
                </div>
                <RetroStatusBadge tone={statusTone(event.status)}>
                  {event.status}
                </RetroStatusBadge>
              </div>
            ))
          ) : (
            <RetroEmptyState title="No events found." />
          )}
        </div>
      </section>
    </div>
  );
}
