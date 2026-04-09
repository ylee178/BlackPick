'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

type FightMethod = Database['public']['Tables']['fights']['Row']['method']

type FightOption = {
  id: string
  status: Database['public']['Tables']['fights']['Row']['status']
  result_processed_at: string | null
  fighter_a_id: string
  fighter_b_id: string
  start_time: string
  event: { id: string; name: string } | null
  fighter_a: { id: string; name: string } | null
  fighter_b: { id: string; name: string } | null
}

const methodOptions: NonNullable<FightMethod>[] = ['KO/TKO', 'Submission', 'Decision']

export default function AdminResultsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [fights, setFights] = useState<FightOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [fightId, setFightId] = useState('')
  const [winnerId, setWinnerId] = useState('')
  const [method, setMethod] = useState<NonNullable<FightMethod>>('Decision')
  const [round, setRound] = useState('1')

  const loadFights = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('fights')
      .select(
        `
        id,
        status,
        result_processed_at,
        fighter_a_id,
        fighter_b_id,
        start_time,
        event:events!fights_event_id_fkey(id, name),
        fighter_a:fighters!fights_fighter_a_id_fkey(id, name),
        fighter_b:fighters!fights_fighter_b_id_fkey(id, name)
      `
      )
      .is('result_processed_at', null)
      .order('start_time', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setFights((data as unknown as FightOption[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void Promise.resolve().then(loadFights)
  }, [loadFights])

  const selectedFight = fights.find((fight) => fight.id === fightId)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!fightId || !winnerId) {
      setError('Please select a fight and winner.')
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)

    const res = await fetch('/api/admin/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fight_id: fightId,
        winner_id: winnerId,
        method,
        round: Number(round),
      }),
    })

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error ?? 'Failed to submit result.')
      setSubmitting(false)
      return
    }

    setMessage('Fight result saved and predictions processed.')
    await loadFights()
    setSubmitting(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Results</h1>
        <p className="mt-2 text-sm text-gray-400">
          Select a fight, enter the official result, and process prediction scoring.
        </p>
      </div>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-xl font-semibold text-white">Input Fight Result</h2>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-gray-300">Fight</label>
            <select
              value={fightId}
              onChange={(e) => {
                const nextFightId = e.target.value
                setFightId(nextFightId)
                const nextFight = fights.find((fight) => fight.id === nextFightId)
                setWinnerId(nextFight?.fighter_a_id ?? '')
              }}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:border-amber-400"
              required
            >
              <option value="">Select fight</option>
              {fights.map((fight) => (
                <option key={fight.id} value={fight.id}>
                  {fight.event?.name ?? 'Unknown Event'} — {fight.fighter_a?.name ?? 'Unknown'} vs{' '}
                  {fight.fighter_b?.name ?? 'Unknown'} ({new Date(fight.start_time).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Winner</label>
            <select
              value={winnerId}
              onChange={(e) => setWinnerId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:border-amber-400"
              required
              disabled={!selectedFight}
            >
              <option value="">Select winner</option>
              {selectedFight ? (
                <>
                  <option value={selectedFight.fighter_a_id}>
                    {selectedFight.fighter_a?.name ?? 'Unknown'}
                  </option>
                  <option value={selectedFight.fighter_b_id}>
                    {selectedFight.fighter_b?.name ?? 'Unknown'}
                  </option>
                </>
              ) : null}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as NonNullable<FightMethod>)}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:border-amber-400"
              required
            >
              {methodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Round</label>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:border-amber-400"
              required
            >
              {[1, 2, 3, 4].map((value) => (
                <option key={value} value={value}>
                  Round {value}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-gray-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Processing...' : 'Submit Result'}
            </button>
          </div>
        </form>

        {message ? <p className="mt-4 text-sm text-green-400">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Fight Queue</h2>
          <button
            onClick={loadFights}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:border-amber-400 hover:text-amber-400"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400">Loading fights...</p>
          ) : fights.length ? (
            fights.map((fight) => (
              <div
                key={fight.id}
                className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-white">
                      {fight.fighter_a?.name ?? 'Unknown'} vs {fight.fighter_b?.name ?? 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {fight.event?.name ?? 'Unknown Event'} •{' '}
                      {new Date(fight.start_time).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-wide text-amber-400">
                    {fight.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No fights found.</p>
          )}
        </div>
      </section>
    </div>
  )
}
