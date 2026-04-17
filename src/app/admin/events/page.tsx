'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import LoadingButtonContent from '@/components/ui/LoadingButtonContent'
import {
  RetroEmptyState,
  RetroStatusBadge,
  retroButtonClassName,
  retroFieldClassName,
  retroPanelClassName,
} from '@/components/ui/retro'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { getSeriesLabelEn } from '@/lib/constants'
import type { Database } from '@/types/database'

type EventRow = Database['public']['Tables']['events']['Row']
type EventInsert = Database['public']['Tables']['events']['Insert']
type EventStatus = EventRow['status']

const seriesOptions: EventInsert['series_type'][] = ['black_cup', 'numbering', 'rise', 'other']
const statusOptions: EventInsert['status'][] = ['upcoming', 'live', 'completed']

function statusTone(status: EventStatus): 'accent' | 'success' | 'info' | 'neutral' {
  if (status === 'live') return 'info'
  if (status === 'completed') return 'success'
  if (status === 'upcoming') return 'accent'
  return 'neutral'
}

export default function AdminEventsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<EventInsert>({
    name: '',
    series_type: 'black_cup',
    date: new Date().toISOString().slice(0, 10),
    status: 'upcoming',
    mvp_video_url: '',
  })

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false })
      .limit(200)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setEvents(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void Promise.resolve().then(loadEvents)
  }, [loadEvents])

  async function handleCreateEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: EventInsert = {
      name: form.name,
      series_type: form.series_type,
      date: form.date,
      status: form.status,
      mvp_video_url: form.mvp_video_url?.trim() ? form.mvp_video_url : null,
    }

    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error ?? 'Failed to create event.')
      setSubmitting(false)
      return
    }

    setForm({
      name: '',
      series_type: 'black_cup',
      date: new Date().toISOString().slice(0, 10),
      status: 'upcoming',
      mvp_video_url: '',
    })

    await loadEvents()
    setSubmitting(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--bp-ink)] sm:text-3xl">Events</h1>
        <p className="mt-2 text-sm text-[var(--bp-muted)]">Create and manage fight events.</p>
      </div>

      <section className={retroPanelClassName({ className: 'p-5' })}>
        <h2 className="text-xl font-semibold text-[var(--bp-ink)]">Create Event</h2>

        <form onSubmit={handleCreateEvent} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-[var(--bp-muted)]">Event Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              className={retroFieldClassName()}
              placeholder="Black Cup 01"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-[var(--bp-muted)]">Series Type</label>
            <select
              value={form.series_type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  series_type: e.target.value as EventInsert['series_type'],
                }))
              }
              className={retroFieldClassName()}
            >
              {seriesOptions.map((option) => (
                <option key={option} value={option}>
                  {getSeriesLabelEn(option)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-[var(--bp-muted)]">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              required
              className={retroFieldClassName()}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-[var(--bp-muted)]">Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as EventInsert['status'],
                }))
              }
              className={retroFieldClassName()}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-[var(--bp-muted)]">MVP Video URL</label>
            <input
              value={form.mvp_video_url ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, mvp_video_url: e.target.value }))}
              className={retroFieldClassName()}
              placeholder="https://..."
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className={retroButtonClassName({ variant: 'primary' })}
            >
              <LoadingButtonContent loading={submitting} loadingLabel="Creating...">
                Create Event
              </LoadingButtonContent>
            </button>
          </div>
        </form>

        {error ? <p className="mt-4 text-sm text-[var(--bp-danger)]">{error}</p> : null}
      </section>

      <section className={retroPanelClassName({ className: 'p-5' })}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--bp-ink)]">All Events</h2>
          <button
            onClick={loadEvents}
            className={retroButtonClassName({ variant: 'soft', size: 'sm' })}
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-[var(--bp-muted)]">Loading events...</p>
          ) : events.length ? (
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--bp-muted)]">
                <tr className="border-b border-[var(--bp-line)]">
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Series</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-[var(--bp-line)]/70">
                    <td className="px-3 py-3 text-[var(--bp-ink)]">{event.name}</td>
                    <td className="px-3 py-3 text-[var(--bp-muted)]">{getSeriesLabelEn(event.series_type)}</td>
                    <td className="px-3 py-3 text-[var(--bp-muted)]">{event.date}</td>
                    <td className="px-3 py-3">
                      <RetroStatusBadge tone={statusTone(event.status)}>
                        {event.status}
                      </RetroStatusBadge>
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="font-semibold text-[var(--bp-accent)] transition hover:opacity-80"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <RetroEmptyState
              title="No events yet"
              description="Create one above to start scheduling fights."
            />
          )}
        </div>
      </section>
    </div>
  )
}
