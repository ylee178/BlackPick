# Spec — Event state auto-transition (`upcoming → live`)

_2026-04-17 · Branch: `docs/event-state-auto-transition-spec` → implementation TBD · **v2 after second-opinion-reviewer APPROVE_WITH_CHANGES (confidence 0.82, 2 blockers + 3 major + 2 minor)**_

## Objective

When a BlackPick event's earliest non-terminal fight `start_time` passes, the UI must treat the event as "live" immediately — matching the per-fight display that already flips at that exact moment (`deriveFightDisplayState`). Today only the fight badges flip; the event-level header still reads "EVENT STARTING SOON" (the softer fallback), producing a visible self-contradiction between header and fight cards.

Sean's literal expectation (2026-04-17): _"타이머가 00:00:00이 되면 바로 event in progress 라이브 상태가 되어야해."_

## Non-goals

- Automatic `live → completed` transition. Semantically different signal (all-fights-resolved, admin-judged) — separate spec.
- Reintroducing cron infrastructure for the MVP. Phase 7 (`feature/crawler-automation`) remains the long-term home of scheduled status sweeps.
- New `events.status` values (stays the existing 3: `upcoming` / `live` / `completed`).
- Revamping `event-ui-state.ts` to a new architecture. Additive edits only — the two-layer model (facts → derivations) is preserved.
- Backfilling pre-Exodus events (already filtered by `EXODUS_ANCHOR_DATE`).
- **Admin dashboard "Live Events" count** (`src/app/admin/page.tsx:32`) reading `effectiveEventPhase`. Admin summary counter intentionally reads **raw** `events.status` to reflect DB truth — see §Acceptance Criteria-8.

## Current gap (code-grounded)

1. **`src/lib/event-ui-state.ts:213-223` — `derivePostLockTimerState`**: when `eventPhase === "upcoming"` AND the timer has burned out, returns `{ kind: "burnedOut", messageKey: "eventStartingSoon" }`. Inline comment (lines 219–222) explicitly chose `eventStartingSoon` over `eventInProgress` to avoid "asserting the event is already in progress" when seed/data is out of sync. That deliberate hedge is what produces the contradiction with fight cards.

2. **`src/lib/event-ui-state.ts:247-258` — `deriveFightDisplayState`**: per-fight, line 256: `if (hasStarted || facts.eventPhase === "live") return "live";` — flips on `start_time <= now`, independent of `event.status`. No DB write involved.

3. **`src/app/[locale]/(main)/events/[id]/page.tsx:182-187` — inline `displayState`**: the event detail page **bypasses** `deriveFightDisplayState` and computes display state with its own inline ternary. This is pre-existing architectural drift. Fixing it is part of this spec's L4 scope because the inline logic reads `event.status` directly — any `effectiveEventPhase` migration that doesn't replace this inline logic is a no-op on the primary user surface.

4. **`src/app/api/admin/events/[id]/route.ts:32`**: the **only** production writer of `events.status`. Admin UI PATCH. Requires `requireAdminApi()`. No public path, no cron, no page-load hook.

5. **`src/app/api/dev/seed/route.ts:1368`**: DevPanel-only status flip (dev flag gated).

6. **No cron infrastructure**: `vercel.json` has no `crons` key. `.github/workflows/` has `test.yml` / `usage-check.yml` / `vercel-cicd.yml` — none cron-scheduled for event state.

**Consequence**: in production, once an event's scheduled start passes without the admin manually flipping `events.status`, the event stays "upcoming" in the DB indefinitely. Users see "STARTING SOON" header + "LIVE" fight badges simultaneously.

## Design options

### Option A — Client-only optimistic phase recompute

Change `derivePostLockTimerState` (and any other `eventPhase`-reading derivation) to treat `(status="upcoming" AND firstLockAt <= now)` as effectively-live. No DB write. No migration.

- **Pros**: surgical. Zero infrastructure cost. Instant UX. No race conditions.
- **Cons**: `events.status` stays `upcoming` in DB forever. Admin dashboard "Live Events" count = 0 during a live event. Queries filtering on `status = 'live'` produce stale counts. Any future feature (notifications, email, scoring) that keys off "event went live" can't subscribe to a client-only flag.

### Option B — Server-side lazy flip on page load

Server-side hook: if `status='upcoming' AND firstLockAt <= now()`, run `UPDATE events SET status='live' WHERE id=$1 AND status='upcoming'` (idempotent, WHERE-guarded). No cron.

- **Pros**: DB converges via natural page traffic. Other features can subscribe to DB state.
- **Cons**: page-load writes fragile (serverless cold-start, concurrent-request waste, cache semantics). Bulk list pages would trigger N writes per load.

### Option C — Hybrid: client optimistic + server lazy flip

Combine A + B. Client-side derivation shows "IN PROGRESS" immediately on timer expiry. Server-side lazy flip runs alongside for DB convergence. Writes stay optional — if server call fails, UI still correct.

- **Pros**: best UX (instant client update, zero network dependency for display). DB eventually consistent. If page cache delays server-side flip, client still shows correct state.
- **Cons**: 2× surface, 2× reasoning. Testing matrix ~2×.

### Option D — Scheduled cron sweep

GH Actions cron (`*/2 * * * *` or similar) hits `/api/cron/event-state-sweep`. Client-side UI does nothing special.

- **Pros**: canonical architecture, single source of truth, no per-request writes.
- **Cons**: up to cron-interval lag (2-min even at aggressive cadence). GH Actions free-tier over budget at `*/2`. Adds ops surface pre-launch.

## Option ranking

| Option | UX latency | DB consistency | Ops cost | Pre-launch fit |
|--------|------------|----------------|----------|----------------|
| A | 0ms | Broken | None | OK for launch, accumulates debt |
| B | 0–cache-window ms | Eventually | Low | Medium |
| C | 0ms | Eventually | Low-Medium | **Best** |
| D | 2–15 min | Strong | High | Poor pre-launch, fits Phase 7 |

**Recommendation**: **Option C (Hybrid)**. Quality-first because:

- Sean's expectation is zero latency at the "00:00:00 moment" — B and D cannot guarantee that under worst-case timing.
- DB consistency is load-bearing for future features.
- Hybrid surface is ~2× the single-path surface, not 2× the complexity — each path is small.
- Degrades cleanly to A if server flip proves fragile.

## Assumptions

1. **"Effective phase"** — a derived value that reads `status='upcoming' AND firstLockAt <= now` as equivalent to `status='live'` for display. Name: `effectiveEventPhase`. Added to `EventUiFacts` so every consumer gets consistent treatment. **Document in jsdoc that this is a display-optimism override**, not a raw fact — the top-of-file comment at `event-ui-state.ts:1-18` needs an update to note that the layer now contains one optimism-derived field alongside raw facts.
2. **Idempotent flip RPC** — server side uses `UPDATE events SET status='live' WHERE id=$1 AND status='upcoming' AND EXISTS (...)`. The `WHERE status='upcoming'` guard makes concurrent calls safe (second caller updates 0 rows, no error).
3. **Server flip trigger location** — event detail page server component only. NOT home or ranking pages (would force N writes when event list has many past-start rows).
4. **No scheduled job added** — Option C stays purely reactive to user traffic.
5. **`firstLockAt` null handling** — events with zero non-terminal fights (all cancelled + no_contest) have `firstLockAt = null`. Never trigger flip. `effectiveEventPhase` returns raw `event.status` in this case.
6. **Timezone / clock skew** — `now` passed in by caller. Server `Date.now()`, client `useClockTick()`. No new time source.
7. **Admin override respected** — admin can still set `completed` mid-event. Flip is `upcoming → live` only, never reverses, never touches completed.
8. **No schema migration** — reuses existing `events.status` enum. RPC is additive.
9. **`process_fight_result` non-interaction** — scoring pipeline keys off `fights.status = 'completed'`, not event-level status. This flip doesn't touch scoring invariants.
10. **Next.js 16 cache semantics** — event detail page uses `export const dynamic = "force-dynamic"` (verified at current page). Each request re-executes the server component, so the RPC fire-and-forget runs on every qualifying request. **Implication**: under peak load (many users opening the event page at timer-zero), many concurrent RPC calls fire. The WHERE guard is idempotent under concurrency — load test if adoption warrants. For MVP, natural rate-limiting via user count is sufficient.
11. **i18n** — zero new keys. Reuses `countdown.eventInProgress` already present in 7 locales.
12. **Test surface** — `event-ui-state.test.ts` has 39 existing cases. Add ~8 new + **update the 2 cases that currently assert `eventStartingSoon`** (they should either assert against the new default or be deleted if the branch is fully dead).
13. **`EventStatusBadge` component** — reads whatever `status` is passed. Consumer decides raw vs effective. User-facing callers pass `effectiveEventPhase`; admin callers pass raw `event.status`.
14. **[v2 new — trigger interaction]** `trg_events_completed_at` (added in `202604170001_integrity_atomicity.sql:19-53`) fires `BEFORE INSERT OR UPDATE ON events`. For an `upcoming → live` UPDATE its branches (line 34 checks `NEW.status='completed'`, line 40 checks `OLD.status='completed'`) both evaluate false, so trigger is a no-op. Verified. Future migrations touching this trigger must preserve the `upcoming → live` no-op behavior.
15. **[v2 new — LockTransitionWatcher race]** `LockTransitionWatcher` fires `router.refresh()` when any `lockTimestamps` entry crosses `now` (rate-limited to ≥10s). Each refresh re-executes the event detail server component, re-evaluating the L4 gate. If the initial fire-and-forget RPC hasn't yet landed, the refreshed render fires a second `sync_event_live_state` call. Idempotent at DB level (WHERE guard), so correctness is preserved. Behavioral note: the RPC can fire 2–3× per user per event-going-live event, not once. Acceptable; idempotency covers it.

## User-visible acceptance criteria

1. **Upcoming event with timer past zero** — event detail page: header reads "EVENT IN PROGRESS", LCD digits dimmed at 00:00:00, `RetroStatusBadge` tone matches live (red). Fight cards all show LIVE badges via `deriveFightDisplayState` (after migration from inline logic). No visible contradiction between header, badge, and fight cards.
2. **Upcoming event with timer in future** — header shows running countdown, `countdown.eventStartsIn` copy. No "IN PROGRESS" state. No DB flip.
3. **Live event** — unchanged.
4. **Completed event** — unchanged. Header "COMPLETED", results visible, no countdown.
5. **Page-load sync (first observable)** — loading event detail for an upcoming event with past `firstLockAt` triggers RPC. After RPC commits, `/admin/events/[id]` list shows status=live. First observable window bounded by RPC latency (<500ms typical) + any DB replication lag.
6. **Admin flip override** — admin manually sets event to `completed` via `/admin/events/[id]`. Next event detail page load does NOT revert to `live` (WHERE `status='upcoming'` guard).
7. **All-cancelled event** — every fight `cancelled` or `no_contest`. `firstLockAt = null`. No flip. Header shows raw `event.status`.
8. **Admin dashboard + admin events list** — `/admin` summary tile "Live Events" and `/admin/events` list both read RAW `event.status`. During the lazy-flip window (DB still upcoming, user-facing pages already show live) admin count will temporarily show 0 live, which is intentional — admin sees DB truth. Callout in admin UI tooltip TBD (separate polish ticket).
9. **Sticky header slot** — `deriveStickyHeaderSlot` uses `effectiveEventPhase` for the completion check. Because `effectiveEventPhase="live"` implies `firstLockAt <= now`, the countdown-vs-streak decision still evaluates correctly (`timerRunning === false` when optimistically live). No contradictory "countdown shown on in-progress event" regression.

## Core features by layer

### L1 — Facts layer expansion (`src/lib/event-ui-state.ts`)

Top-of-file comment (lines 1–18) updated to note:

> As of 2026-04 this file contains one derived-optimism field (`effectiveEventPhase`) alongside raw facts. The invariant "never overridden by fight signals" at `EventUiFacts.eventPhase` still holds — `eventPhase` remains raw. `effectiveEventPhase` is the explicit display-override field; callers pick one.

Add one new field to `EventUiFacts`:

```ts
export type EventUiFacts = {
  /** Raw event.status — unchanged invariant, never overridden. */
  eventPhase: EventStatus;

  /**
   * Display-optimism override. Returns "live" when (eventPhase === "upcoming"
   * AND firstLockAt !== null AND firstLockAt <= now); otherwise equals eventPhase.
   * User-facing surfaces (event detail, share, sticky header, home card) use
   * this. Admin surfaces + state-mutating code paths read eventPhase.
   */
  effectiveEventPhase: EventStatus;

  firstLockAt: string | null;
  allFightsLocked: boolean;
  hasLiveFight: boolean;
  hasCompletedFight: boolean;
};
```

Derivation rule (inside `deriveEventUiFacts`):

```ts
const effectiveEventPhase: EventStatus =
  event.status === "upcoming" &&
  firstLockAt !== null &&
  new Date(firstLockAt).getTime() <= now
    ? "live"
    : event.status;
```

### L2 — Derivation consumer updates

- `derivePostLockTimerState` (line 213): simplify to read `effectiveEventPhase`. When `effectiveEventPhase === "completed"` → `hide`; when `effectiveEventPhase === "live"` (including optimistic) → `{ kind: "burnedOut", messageKey: "eventInProgress" }`. **The `eventStartingSoon` branch becomes dead code — delete it. Tests referencing it must also be updated or deleted.**
- `deriveFightDisplayState` (line 247): **unchanged**. Per-fight already optimistic via `hasStarted` check (line 255). Verified no edit needed.
- `deriveStickyHeaderSlot` (line 166): replace `facts.eventPhase !== "completed"` with `facts.effectiveEventPhase !== "completed"`. Assumption 15 covers why this is consistent.

### L3 — Server-side lazy flip RPC

**New migration** `supabase/migrations/20260418XXXX_event_live_sync.sql`:

```sql
CREATE OR REPLACE FUNCTION public.sync_event_live_state(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE events
  SET status = 'live'
  WHERE id = p_event_id
    AND status = 'upcoming'
    AND EXISTS (
      SELECT 1
      FROM fights
      WHERE fights.event_id = events.id
        AND fights.status NOT IN ('cancelled', 'no_contest')
        AND fights.start_time <= now()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_event_live_state(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_event_live_state(uuid) TO service_role;

COMMENT ON FUNCTION public.sync_event_live_state(uuid) IS
  'Idempotent upcoming→live flip. Safe under concurrent calls: WHERE status=upcoming guards against double-update. Only transitions forward; never reverts. Does not interact with trg_events_completed_at (verified no-op for this status pair). Added by spec 2026-04-17-event-state-auto-transition.';
```

Key properties:
- `SECURITY DEFINER` so client-role callers can invoke via service-role RPC wrapper.
- `SET search_path` per codex-integrity-atomicity hardening convention.
- `REVOKE ... FROM PUBLIC` + explicit `GRANT service_role`.
- Single UPDATE, atomic by default.

### L4 — Event detail page migration table

`src/app/[locale]/(main)/events/[id]/page.tsx` — concrete call-site migration.

**Step 1 — Compute facts once, use everywhere**

Move `eventFacts = deriveEventUiFacts(event, typedFights, nowTimestamp)` up to immediately after `earliestStart`. (Currently computed at line 172, after many `event.status` reads.) **Derive `effectiveEventPhase` from `eventFacts`, not from `event.status`.**

**Step 2 — Per-call-site migration**

| Line(s) | Current | Change | Rationale |
|---------|---------|--------|-----------|
| 101 | `const eventStatus = event.status as ...` | `const eventStatus = eventFacts.effectiveEventPhase` | Primary display variable |
| 182–187 | Inline `displayState` ternary | `const displayState = deriveFightDisplayState(fight, eventFacts, nowTimestamp)` | Replace drift-inline logic with library function (Assumption 13 + Blocker #1). Side effect: now handles `no_contest` correctly. |
| 269 | `eventStatus === "live" \|\| eventStatus === "upcoming"` | unchanged (already reads `eventStatus`, which post-step-1 is effective) | Variable rename propagates. |
| 306, 311 | Pass `eventStatus` to `<StickyEventHeader>` | unchanged (same propagation) | |
| 330, 416 | `<RetroStatusBadge status={event.status}>` | `<RetroStatusBadge status={effectiveEventPhase}>` | Header badge is user-facing. |
| 363 | `event.status` in `<FlipTimer>` parent logic | unchanged (reads effective via `flipTimerMessageKey`) | |
| 439, 509, 528 | UI labels keyed off `eventStatus` | unchanged (variable rename propagates) | |

**Step 3 — Fire-and-forget RPC**

Placed after `eventFacts` is computed and before the render. Uses `eventFacts.firstLockAt` (terminal-filtered), NOT `earliestStart` (not filtered):

```ts
if (
  event.status === "upcoming" &&
  eventFacts.firstLockAt &&
  new Date(eventFacts.firstLockAt).getTime() <= nowTimestamp
) {
  // Fire-and-forget — UI already shows effective state via eventFacts.effectiveEventPhase.
  // DB converges asynchronously. Service role required (RPC grants only service_role).
  createSupabaseAdmin()
    .rpc("sync_event_live_state", { p_event_id: event.id })
    .then(({ error }) => {
      if (error) Sentry.captureException(error, { level: "warning", extra: { event_id: event.id } });
    });
}
```

### L5 — Other user-facing surfaces

Apply `effectiveEventPhase` consistently wherever user-facing UI compares event state:

- `src/components/StickyEventHeader.tsx` — already accepts `eventStatus` prop; caller in event detail now passes `effectiveEventPhase`.
- `src/app/[locale]/(main)/page.tsx` (home) — `activeEvents` filter at line 115 currently includes upcoming + live. **Decision (see §L5 caveat)**: home page accepts divergence. Home badge shows raw status; detail page flips.
- `src/app/[locale]/(main)/dashboard/page.tsx:665` — raw status read. User-facing. Should migrate — but requires fetching earliest fight per event in the dashboard query (query cost). **Decision**: defer to follow-on if dashboard divergence is reported. Current behavior preserved.
- `src/app/[locale]/(share)/p/[username]/[eventShortId]/page.tsx` — share page. User-facing. Similar trade-off; defer.
- `src/components/FightCard.tsx` — per-fight, uses `deriveFightDisplayState`. Already covered.

**Admin surfaces (unchanged — read raw)**:
- `src/app/admin/page.tsx` — dashboard summary tile
- `src/app/admin/events/page.tsx` — list
- `src/app/admin/events/[id]/page.tsx` — detail + PATCH form
- `src/components/EventStatusBadge.tsx` in admin contexts

### L5 caveat — list page divergence (closed)

**Closed decision (formerly Open Q4)**: home page + dashboard + share page + ranking accept raw-status divergence for MVP. Rationale:

- These pages don't fetch per-event fight rows in their list queries, so `firstLockAt` is unavailable without a second query.
- Adding `firstLockAt` to list queries either requires a join (extra DB work) or a materialized `fights_first_start` column (premature optimization).
- Detail-page divergence from list-page is tolerable because the user visiting the detail page gets the correct view **and** triggers the DB flip. On their next return to the list page, the list reflects the flipped status naturally.
- If the divergence surfaces as a real UX issue (user complaints about inconsistent badges across pages), revisit with a "materialize earliest start" approach.

## Tests

### Unit (`src/lib/event-ui-state.test.ts`)

- `effectiveEventPhase returns "live" when status=upcoming and firstLockAt<=now`
- `effectiveEventPhase returns raw status when status=upcoming and firstLockAt>now`
- `effectiveEventPhase returns raw status when status=upcoming and firstLockAt=null (no fights)`
- `effectiveEventPhase returns raw status when status=live regardless of firstLockAt`
- `effectiveEventPhase returns raw status when status=completed regardless of firstLockAt`
- `derivePostLockTimerState returns eventInProgress when effectiveEventPhase="live" and upcoming-optimistic`
- `derivePostLockTimerState returns hide when effectiveEventPhase="completed"`
- **Regression**: the existing 2 test cases that assert `eventStartingSoon` must either be deleted (if branch fully dead) or updated to assert `eventInProgress`. Do NOT leave silent-regression cases.
- `deriveStickyHeaderSlot reads effectiveEventPhase` — no countdown on optimistic-live events.

### Integration (if RPC shipped)

- `sync_event_live_state flips upcoming→live when earliest non-terminal fight start_time <= now()`
- `sync_event_live_state no-op when status=live` (idempotent forward)
- `sync_event_live_state no-op when status=completed` (never reverts)
- `sync_event_live_state no-op when all fights terminal` (no non-terminal non-future fight)
- `sync_event_live_state no-op when earliest non-terminal fight start_time > now()`
- `sync_event_live_state concurrent callers — no error, 0 or 1 affected rows per call`

### Regression (manual checklist)

- Event detail page on upcoming + past-timer: header "EVENT IN PROGRESS", fight cards show LIVE, admin `/admin/events` shows status=live after ~500ms refresh.
- Event detail page on upcoming + future-timer: header shows countdown, admin unchanged.
- Event detail page on live event: unchanged.
- Event detail page on completed event: unchanged.
- Home page during a qualifying event (admin not yet flipped): home card shows "UPCOMING" badge — documented divergence, acceptable for MVP.
- Admin dashboard "Live Events" tile during lazy-flip window: shows 0 live briefly until detail-page-triggered flip commits. Documented intentional.

## i18n

No new keys. Reuses `countdown.eventInProgress` already present in 7 locales.

## Open questions for reviewer — closed in v2

1. ~~**Q1 client optimism scope**~~ **CLOSED v2**: admin surfaces (list, detail PATCH, dashboard tile) read raw. User-facing (detail, sticky header, share, dashboard event chips, home) either migrate to effective (detail, sticky) or accept divergence (home, dashboard, share — MVP scope).
2. ~~**Q2 RPC vs direct UPDATE**~~ **CLOSED v2**: use RPC. Aligns with the Codex integrity-atomicity hardening convention (SET search_path + REVOKE FROM PUBLIC + GRANT service_role). Direct UPDATE from page code bypasses the convention and breaks the COMMENT-ON-FUNCTION audit trail.
3. ~~**Q3 cache semantics**~~ **CLOSED v2**: event detail already `force-dynamic` (verified). RPC fires per request, WHERE guard handles concurrency. No cache directive change.
4. ~~**Q4 list page N+1 / divergence**~~ **CLOSED v2**: home/ranking/dashboard/share accept raw-status divergence. Revisit only if user reports surface it.
5. ~~**Q5 observability**~~ **CLOSED v2**: Sentry warning on RPC error only. No `event_state_events` audit table for MVP — Phase 7 `feature/crawler-automation` can add one later if scheduled sweeps want an audit trail.
6. ~~**Q6 time source race**~~ **CLOSED v2**: client `useClockTick` 1Hz, server `Date.now()` per request. Brief disagreement possible but both paths converge within RPC round-trip. Acceptable.
7. ~~**Q7 completed transition bundling**~~ **CLOSED v2**: strict scope. `live → completed` is a separate spec.
8. ~~**Q8 migration backfill**~~ **CLOSED v2**: no backfill SQL. Organic convergence via user traffic is acceptable for MVP. Pre-Exodus events (`date < 2026-01-31`) already filtered from featured/list surfaces.

## Review path

- **Tier**: B (elevated — new state-machine + new SECURITY DEFINER RPC).
- **Primary**: `second-opinion-reviewer` subagent (Sonnet 4.6) with red-team framing. **v1 review completed 2026-04-17**: APPROVE_WITH_CHANGES at 0.82 confidence. 2 blockers + 3 major + 2 minor findings folded into v2.
- **Escalate to Codex CLI (`scripts/codex-review.sh max`)** — NOT required per reviewer's explicit verdict. The RPC is 6 lines with deterministic guards; blockers were implementation-completeness issues (caller migration gap, terminal-fight filter), not shared-training-weights blind spots.
- **Cross-family (Tier C)** NOT required — no auth/RLS/money math.
- **Post-implementation review**: if the implementation PR deviates from v2 spec non-trivially (new RPC body, different call-site coverage), round-2 review dispatch per standard `blackpick` profile.

## v2 changelog (vs v1)

Folded findings from 2026-04-17 second-opinion-reviewer round:

- **[blocker] Caller migration gap**: §L4 now has a per-line migration table for `events/[id]/page.tsx`, including replacement of the inline `displayState` computation (lines 182–187) with `deriveFightDisplayState`. §Current gap #3 added to flag this pre-existing drift.
- **[blocker] Terminal-fight filter on `firstLockAt`**: §L4 RPC pre-condition now explicitly uses `eventFacts.firstLockAt`, not `earliestStart` (which does not filter terminal fights).
- **[major] Trigger interaction**: Assumption 14 added documenting `trg_events_completed_at` no-op for `upcoming → live`. RPC `COMMENT ON FUNCTION` updated.
- **[major] Admin dashboard divergence**: explicit Non-goal + AC-8 added.
- **[major] LockTransitionWatcher race**: Assumption 15 added; no code change needed, idempotency guard covers.
- **[minor] Q4 list page divergence**: closed with documented decision (§L5 caveat).
- **[minor] Facts layer invariant weakening**: Assumption 1 now requires jsdoc + file-header update. §L1 code shows the jsdoc.
- **[minor] Q2 RPC choice**: closed with "use RPC" decision per hardening convention.

## v1 → v2 diff in open questions

| # | v1 state | v2 state |
|---|---|---|
| Q1 Client optimism scope | open | closed — enumerated per surface |
| Q2 RPC vs direct UPDATE | open | closed — RPC per hardening convention |
| Q3 Cache semantics | open | closed — force-dynamic verified |
| Q4 List page N+1 | open | closed — accept divergence for MVP |
| Q5 Observability | open | closed — Sentry-only, no audit table |
| Q6 Time source race | open | closed — converges within RPC round-trip |
| Q7 live → completed bundling | open | closed — strict scope |
| Q8 Backfill SQL | open | closed — organic convergence |

All 8 questions now decided. No deferrals.
