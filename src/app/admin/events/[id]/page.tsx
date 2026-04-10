import { requireAdminPage } from '@/lib/admin-auth'
import PendingSubmitButton from '@/components/ui/PendingSubmitButton'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/types/database'

type Params = Promise<{ id: string }>
type EventStatus = Database['public']['Tables']['events']['Row']['status']
type Fighter = Database['public']['Tables']['fighters']['Row']

async function EventStatusForm({
  eventId,
  currentStatus,
}: {
  eventId: string
  currentStatus: EventStatus
}) {
  'use client'
  const statuses: EventStatus[] = ['upcoming', 'live', 'completed']

  async function updateStatus(formData: FormData) {
    const status = formData.get('status') as EventStatus
    const res = await fetch(`/api/admin/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      alert(data?.error ?? 'Failed to update event status.')
      return
    }
    window.location.reload()
  }

  return (
    <form action={updateStatus} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div>
        <label className="mb-2 block text-sm text-gray-300">Event Status</label>
        <select
          name="status"
          defaultValue={currentStatus}
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:border-amber-400"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <PendingSubmitButton
        className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-gray-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        loadingLabel="Updating..."
      >
        Update Status
      </PendingSubmitButton>
    </form>
  )
}

async function AddFightForm({
  eventId,
  fighters,
}: {
  eventId: string
  fighters: Fighter[]
}) {
  'use client'

  async function createFight(formData: FormData) {
    const fighter_a_id = String(formData.get('fighter_a_id'))
    const fighter_b_id = String(formData.get('fighter_b_id'))
    const start_time = String(formData.get('start_time'))

    if (!fighter_a_id || !fighter_b_id || !start_time || fighter_a_id === fighter_b_id) {
      alert('Please select two different fighters and a valid start time.')
      return
    }

    // Send the raw datetime-local string — the server owns conversion and
    // interprets it as Korea Standard Time (the venue is in Seoul). Doing
    // the conversion client-side would anchor the value to whatever timezone
    // the admin happens to be browsing from.
    const res = await fetch(`/api/admin/events/${eventId}/fights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fighter_a_id,
        fighter_b_id,
        start_time,
      }),
    })

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      alert(data?.error ?? 'Failed to add fight.')
      return
    }

    window.location.reload()
  }

  return (
    <form action={createFight} className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm text-gray-300">Fighter A</label>
        <select
          name="fighter_a_id"
          required
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:border-amber-400"
        >
          <option value="">Select fighter</option>
          {fighters.map((fighter) => (
            <option key={fighter.id} value={fighter.id}>
              {fighter.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-300">Fighter B</label>
        <select
          name="fighter_b_id"
          required
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:border-amber-400"
        >
          <option value="">Select fighter</option>
          {fighters.map((fighter) => (
            <option key={fighter.id} value={fighter.id}>
              {fighter.name}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm text-gray-300">
          Start Time (KST — 한국 표준시, Asia/Seoul)
        </label>
        <input
          type="datetime-local"
          name="start_time"
          required
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:border-amber-400"
        />
        <p className="mt-2 text-xs text-gray-500">
          Enter the fight start time in Korea Standard Time. The server stores it as UTC
          and the app converts to each viewer&apos;s timezone at render time.
        </p>
      </div>

      <div className="md:col-span-2">
        <PendingSubmitButton
          className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-gray-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          loadingLabel="Adding..."
        >
          Add Fight
        </PendingSubmitButton>
      </div>
    </form>
  )
}

export default async function AdminEventDetailPage({
  params,
}: {
  params: Params
}) {
  await requireAdminPage()
  const { id } = await params
  const supabase = createSupabaseAdmin()

  const [{ data: event }, { data: fights }, { data: fighters }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase
      .from('fights')
      .select('id, event_id, fighter_a_id, fighter_b_id, winner_id, method, round, start_time, status')
      .eq('event_id', id)
      .order('start_time', { ascending: true }),
    supabase.from('fighters').select('*').order('name', { ascending: true }).limit(500),
  ])

  if (!event) {
    return <div className="text-sm text-red-400">Event not found.</div>
  }

  const fighterMap = new Map((fighters ?? []).map((fighter) => [fighter.id, fighter.name]))

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{event.name}</h1>
        <p className="mt-2 text-sm text-gray-400">
          {event.series_type === 'other' ? 'Champions League' : event.series_type === 'black_cup' ? 'Black Cup' : event.series_type === 'numbering' ? 'Numbering' : 'Rise'} • {event.date}
        </p>

        <div className="mt-6">
          <EventStatusForm eventId={event.id} currentStatus={event.status} />
        </div>
      </div>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-xl font-semibold text-white">Fights</h2>
        <div className="mt-4 space-y-3">
          {fights?.length ? (
            fights.map((fight) => (
              <div
                key={fight.id}
                className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-white">
                      {fighterMap.get(fight.fighter_a_id) ?? 'Unknown'} vs{' '}
                      {fighterMap.get(fight.fighter_b_id) ?? 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(fight.start_time).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-wide text-amber-400">
                    {fight.status}
                  </span>
                </div>

                {fight.status === 'completed' && fight.winner_id ? (
                  <p className="mt-3 text-sm text-gray-300">
                    Winner: <span className="text-amber-400">{fighterMap.get(fight.winner_id)}</span>
                    {fight.method ? ` • ${fight.method}` : ''}
                    {fight.round ? ` • Round ${fight.round}` : ''}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No fights added yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-xl font-semibold text-white">Add Fight</h2>
        <div className="mt-4">
          <AddFightForm eventId={event.id} fighters={fighters ?? []} />
        </div>
      </section>
    </div>
  )
}
