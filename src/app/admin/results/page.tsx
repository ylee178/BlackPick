'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import LoadingButtonContent from '@/components/ui/LoadingButtonContent'
import {
  RetroEmptyState,
  RetroStatusBadge,
  retroButtonClassName,
  retroFieldClassName,
  retroPanelClassName,
} from '@/components/ui/retro'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

type FightMethod = Database['public']['Tables']['fights']['Row']['method']
type FightStatus = Database['public']['Tables']['fights']['Row']['status']

type FightOption = {
  id: string
  status: FightStatus
  result_processed_at: string | null
  fighter_a_id: string
  fighter_b_id: string
  /**
   * Pre-staged winner from `sync-bc-event-results` (BC crawler).
   * May be null (no winner yet on BC side, or fight hasn't been
   * synced) OR may be correct — admin confirms + adds method/round.
   * See `src/scripts/sync-bc-event-results.ts` for the staging flow.
   */
  winner_id: string | null
  start_time: string
  event: { id: string; name: string } | null
  fighter_a: { id: string; name: string } | null
  fighter_b: { id: string; name: string } | null
}

const methodOptions: NonNullable<FightMethod>[] = ['KO/TKO', 'Submission', 'Decision']

function fightStatusTone(status: FightStatus): 'accent' | 'success' | 'danger' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'upcoming') return 'accent'
  if (status === 'cancelled') return 'danger'
  return 'neutral'
}

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
        winner_id,
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
        <h1 className="text-2xl font-bold text-[var(--bp-ink)] sm:text-3xl">Results</h1>
        <p className="mt-2 text-sm text-[var(--bp-muted)]">
          Select a fight, enter the official result, and process prediction scoring.
        </p>
      </div>

      <section className={retroPanelClassName({ className: 'p-5' })}>
        <h2 className="text-xl font-semibold text-[var(--bp-ink)]">Input Fight Result</h2>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-[var(--bp-muted)]">Fight</label>
            <select
              value={fightId}
              onChange={(e) => {
                const nextFightId = e.target.value
                setFightId(nextFightId)
                const nextFight = fights.find((fight) => fight.id === nextFightId)
                // Prefer the crawler-staged winner (sync-bc-event-results)
                // if present; fall back to fighter_a so the dropdown
                // always has a valid selection.
                setWinnerId(nextFight?.winner_id ?? nextFight?.fighter_a_id ?? '')
              }}
              className={retroFieldClassName()}
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
            <label className="mb-2 block text-sm text-[var(--bp-muted)]">Winner</label>
            <select
              value={winnerId}
              onChange={(e) => setWinnerId(e.target.value)}
              className={retroFieldClassName()}
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
            <label className="mb-2 block text-sm text-[var(--bp-muted)]">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as NonNullable<FightMethod>)}
              className={retroFieldClassName()}
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
            <label className="mb-2 block text-sm text-[var(--bp-muted)]">Round</label>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className={retroFieldClassName()}
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
              aria-busy={submitting}
              className={retroButtonClassName({ variant: 'primary' })}
            >
              <LoadingButtonContent loading={submitting} loadingLabel="Processing...">
                Submit Result
              </LoadingButtonContent>
            </button>
          </div>
        </form>

        {message ? <p className="mt-4 text-sm text-[var(--bp-success)]">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-[var(--bp-danger)]">{error}</p> : null}
      </section>

      <section className={retroPanelClassName({ className: 'p-5' })}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--bp-ink)]">Fight Queue</h2>
          <button
            onClick={loadFights}
            className={retroButtonClassName({ variant: 'soft', size: 'sm' })}
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-[var(--bp-muted)]">Loading fights...</p>
          ) : fights.length ? (
            fights.map((fight) => (
              <div
                key={fight.id}
                className={retroPanelClassName({ tone: 'flat', className: 'px-4 py-4' })}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-[var(--bp-ink)]">
                      {fight.fighter_a?.name ?? 'Unknown'} vs {fight.fighter_b?.name ?? 'Unknown'}
                    </p>
                    <p className="text-sm text-[var(--bp-muted)]">
                      {fight.event?.name ?? 'Unknown Event'} •{' '}
                      {new Date(fight.start_time).toLocaleString()}
                    </p>
                  </div>
                  <RetroStatusBadge tone={fightStatusTone(fight.status)}>
                    {fight.status}
                  </RetroStatusBadge>
                </div>
              </div>
            ))
          ) : (
            <RetroEmptyState
              title="Queue clear"
              description="No unprocessed fights waiting for results."
            />
          )}
        </div>
      </section>
    </div>
  )
}
