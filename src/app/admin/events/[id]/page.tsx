import { requireAdminPage } from '@/lib/admin-auth'
import PendingSubmitButton from '@/components/ui/PendingSubmitButton'
import {
  RetroEmptyState,
  RetroStatusBadge,
  retroButtonClassName,
  retroFieldClassName,
  retroPanelClassName,
} from '@/components/ui/retro'
import { getSeriesLabelEn } from '@/lib/constants'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/types/database'

type Params = Promise<{ id: string }>
type EventStatus = Database['public']['Tables']['events']['Row']['status']
type FightStatus = Database['public']['Tables']['fights']['Row']['status']
type Fighter = Database['public']['Tables']['fighters']['Row']

function fightStatusTone(status: FightStatus): 'accent' | 'success' | 'danger' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'upcoming') return 'accent'
  if (status === 'cancelled') return 'danger'
  return 'neutral'
}

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
      <div className="flex-1">
        <label className="mb-2 block text-sm text-[var(--bp-muted)]">Event Status</label>
        <select
          name="status"
          defaultValue={currentStatus}
          className={retroFieldClassName()}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <PendingSubmitButton
        className={retroButtonClassName({ variant: 'primary' })}
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
        <label className="mb-2 block text-sm text-[var(--bp-muted)]">Fighter A</label>
        <select name="fighter_a_id" required className={retroFieldClassName()}>
          <option value="">Select fighter</option>
          {fighters.map((fighter) => (
            <option key={fighter.id} value={fighter.id}>
              {fighter.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm text-[var(--bp-muted)]">Fighter B</label>
        <select name="fighter_b_id" required className={retroFieldClassName()}>
          <option value="">Select fighter</option>
          {fighters.map((fighter) => (
            <option key={fighter.id} value={fighter.id}>
              {fighter.name}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm text-[var(--bp-muted)]">
          Start Time (KST — 한국 표준시, Asia/Seoul)
        </label>
        <input
          type="datetime-local"
          name="start_time"
          required
          className={retroFieldClassName()}
        />
        <p className="mt-2 text-xs text-[var(--bp-muted)]">
          Enter the fight start time in Korea Standard Time. The server stores it as UTC
          and the app converts to each viewer&apos;s timezone at render time.
        </p>
      </div>

      <div className="md:col-span-2">
        <PendingSubmitButton
          className={retroButtonClassName({ variant: 'primary' })}
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
    return <div className="text-sm text-[var(--bp-danger)]">Event not found.</div>
  }

  const fighterMap = new Map((fighters ?? []).map((fighter) => [fighter.id, fighter.name]))

  return (
    <div className="space-y-8">
      <div className={retroPanelClassName({ className: 'p-5' })}>
        <h1 className="text-2xl font-bold text-[var(--bp-ink)] sm:text-3xl">{event.name}</h1>
        <p className="mt-2 text-sm text-[var(--bp-muted)]">
          {getSeriesLabelEn(event.series_type)} • {event.date}
        </p>

        <div className="mt-6">
          <EventStatusForm eventId={event.id} currentStatus={event.status} />
        </div>
      </div>

      <section className={retroPanelClassName({ className: 'p-5' })}>
        <h2 className="text-xl font-semibold text-[var(--bp-ink)]">Fights</h2>
        <div className="mt-4 space-y-3">
          {fights?.length ? (
            fights.map((fight) => (
              <div
                key={fight.id}
                className={retroPanelClassName({ tone: 'flat', className: 'px-4 py-4' })}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-[var(--bp-ink)]">
                      {fighterMap.get(fight.fighter_a_id) ?? 'Unknown'} vs{' '}
                      {fighterMap.get(fight.fighter_b_id) ?? 'Unknown'}
                    </p>
                    <p className="text-sm text-[var(--bp-muted)]">
                      {new Date(fight.start_time).toLocaleString()}
                    </p>
                  </div>
                  <RetroStatusBadge tone={fightStatusTone(fight.status)}>
                    {fight.status}
                  </RetroStatusBadge>
                </div>

                {fight.status === 'completed' && fight.winner_id ? (
                  <p className="mt-3 text-sm text-[var(--bp-muted)]">
                    Winner:{' '}
                    <span className="text-[var(--bp-accent)]">
                      {fighterMap.get(fight.winner_id)}
                    </span>
                    {fight.method ? ` • ${fight.method}` : ''}
                    {fight.round ? ` • Round ${fight.round}` : ''}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <RetroEmptyState
              title="No fights scheduled"
              description="Add the first fight using the form below."
            />
          )}
        </div>
      </section>

      <section className={retroPanelClassName({ className: 'p-5' })}>
        <h2 className="text-xl font-semibold text-[var(--bp-ink)]">Add Fight</h2>
        <div className="mt-4">
          <AddFightForm eventId={event.id} fighters={fighters ?? []} />
        </div>
      </section>
    </div>
  )
}
