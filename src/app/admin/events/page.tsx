'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import LoadingButtonContent from '@/components/ui/LoadingButtonContent'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { getSeriesLabel } from '@/lib/constants'
import type { Database } from '@/types/database'

type EventRow = Database['public']['Tables']['events']['Row']
type EventInsert = Database['public']['Tables']['events']['Insert']

const seriesOptions: EventInsert['series_type'][] = ['black_cup', 'numbering', 'rise', 'other']
const statusOptions: EventInsert['status'][] = ['upcoming', 'live', 'completed']

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
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Events</h1>
        <p className="mt-2 text-sm text-gray-400">Create and manage fight events.</p>
      </div>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-xl font-semibold text-white">Create Event</h2>

        <form onSubmit={handleCreateEvent} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-gray-300">Event Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none ring-0 placeholder:text-gray-400 focus:border-amber-400"
              placeholder="Black Cup 01"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Series Type</label>
            <select
              value={form.series_type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  series_type: e.target.value as EventInsert['series_type'],
                }))
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:border-amber-400"
            >
              {seriesOptions.map((option) => (
                <option key={option} value={option}>
                  {getSeriesLabel(option)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:border-amber-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as EventInsert['status'],
                }))
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:border-amber-400"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">MVP Video URL</label>
            <input
              value={form.mvp_video_url ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, mvp_video_url: e.target.value }))}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white placeholder:text-gray-400 focus:border-amber-400"
              placeholder="https://..."
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-gray-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LoadingButtonContent loading={submitting} loadingLabel="Creating...">
                Create Event
              </LoadingButtonContent>
            </button>
          </div>
        </form>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">All Events</h2>
          <button
            onClick={loadEvents}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:border-amber-400 hover:text-amber-400"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-gray-400">Loading events...</p>
          ) : events.length ? (
            <table className="min-w-full text-left text-sm">
              <thead className="text-gray-400">
                <tr className="border-b border-gray-800">
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Series</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-gray-800/70">
                    <td className="px-3 py-3 text-white">{event.name}</td>
                    <td className="px-3 py-3 text-gray-300">{getSeriesLabel(event.series_type)}</td>
                    <td className="px-3 py-3 text-gray-300">{event.date}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-wide text-amber-400">
                        {event.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="text-amber-400 hover:text-amber-300"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400">No events created yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}
