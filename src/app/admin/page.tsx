import { createSupabaseServer } from '@/lib/supabase-server'

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServer()

  const [
    { count: eventsCount },
    { count: liveEventsCount },
    { count: fightsCount },
    { count: fightersCount },
    { count: predictionsCount },
    { count: usersCount },
  ] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    supabase.from('fights').select('*', { count: 'exact', head: true }),
    supabase.from('fighters').select('*', { count: 'exact', head: true }),
    supabase.from('predictions').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
  ])

  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, name, date, status')
    .order('date', { ascending: true })
    .limit(5)

  const stats = [
    { label: 'Events', value: eventsCount ?? 0 },
    { label: 'Live Events', value: liveEventsCount ?? 0 },
    { label: 'Fights', value: fightsCount ?? 0 },
    { label: 'Fighters', value: fightersCount ?? 0 },
    { label: 'Predictions', value: predictionsCount ?? 0 },
    { label: 'Users', value: usersCount ?? 0 },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-gray-400">Overview of platform activity and upcoming events.</p>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-amber-400">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-lg font-semibold text-white">Upcoming / Recent Events</h2>
        <div className="mt-4 space-y-3">
          {upcomingEvents?.length ? (
            upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{event.name}</p>
                  <p className="text-sm text-gray-400">{event.date}</p>
                </div>
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-400">
                  {event.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No events found.</p>
          )}
        </div>
      </section>
    </div>
  )
}
