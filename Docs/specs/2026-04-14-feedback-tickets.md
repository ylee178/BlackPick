# `db/feedback-tickets` spec v2 — **DEFERRED (preserved for future reference)**

> ⚠️ **STATUS 2026-04-14**: This spec is **DEFERRED**, not currently being implemented.
>
> After a Phase 2 scope re-evaluation later the same day, Sean and Claude agreed the DB-based ticket system is **over-engineering for BlackPick's pre-launch scale**. The current Phase 2 plan uses a much simpler email relay architecture instead:
>
> **Current Phase 2 path (see `TASKS.md §Phase 2`)**:
> 1. `docs/email-setup` — Cloudflare Email Routing + Resend + Gmail Send As (`Docs/email-setup.md`)
> 2. `feature/feedback-email-relay` — `POST /api/feedback` → Resend → Sean's Gmail (Reply-To = user)
> 3. `feature/sentry-setup` — `@sentry/nextjs` + Sentry native email alerts to `admin@blackpick.io`
> 4. `feature/admin-surface-consolidation` — unchanged (independent of feedback/Sentry)
>
> **Why deferred**:
> - Gmail labels/threads already provide the "ticket" abstraction at BlackPick's scale (<500 users)
> - Gmail DPA provides stronger PIPA 처리위탁 defensibility than Notion Free tier ToS or a custom DB table
> - Zero maintenance burden vs. 200+ lines of DB + RLS + webhook bridge code
> - `ON DELETE CASCADE` on `user_id` was the proposed PIPA fix but is moot if no data is stored in BlackPick at all
> - Sentry + feedback split across Gmail (feedback) and Sentry dashboard (errors) is actually cleaner than trying to consolidate in a single DB table
>
> **When to revisit**:
> - User base exceeds ~500 active users AND feedback volume exceeds ~50 tickets/week
> - Need for automated analytics anomaly detection (Phase 7 originally planned) — that was the other source that would have written to this table
> - Requirement for cross-team triage workflow (BlackPick is currently 1 maintainer)
> - SOC-2 audit requiring first-party data retention records
>
> **What this spec still provides**:
> - Full DDL for when the DB-based path is revived
> - RLS policy design (round-1 reviewed, max profile)
> - Post-convergence assertion pattern
> - GDPR/PIPA erasure architecture options (A/B/C — Option C was "defer to user account deletion flow", which is the current state since BlackPick already has `/api/profile/delete-account`)
> - Index design + query pattern analysis
>
> The spec is **preserved in-tree** (not gitignored) because it represents completed design work (2026-04-14 spec-phase round-1 review via `second-opinion-reviewer` blackpick_max profile, APPROVE_WITH_CHANGES 0.91, all 15 findings folded). Reviving the DB path in the future means revalidating the spec against current code state, not redesigning from scratch.

---

## Original spec content (below — unchanged from v2 fold)

**Review profile**: `blackpick_max` (migration, RLS, abuse-vector surface). This is spec v2 after round 1 review folds. Round 1 verdict: APPROVE_WITH_CHANGES 0.91 with 2 blockers + 3 majors + 3 minors + 6 open questions + 1 scope gap. **All 15 findings folded below.** Implementation PR is the next session / next round.

## Round 1 fold trail

| # | Severity | Issue | Fold status | Location in v2 |
|---|---|---|---|---|
| 1 | blocker | `source_key` column undecided | **folded**: added to DDL + partial UNIQUE index | §DDL / §Indexes |
| 2 | blocker | `CREATE TRIGGER` not idempotent | **folded**: `CREATE OR REPLACE TRIGGER` (PG 14+, Supabase PG 15+) | §Trigger |
| 3 | major | Assertions missing 2 indexes + negative path | **folded**: extended to 10 assertions including negative-path INSERT | §Post-convergence |
| 4 | major | "Index-only scan" claim wrong | **folded**: corrected comment | §Indexes |
| 5 | major | GDPR erasure architecture unresolved | **folded**: Option C — explicit deferral + TASKS.md backlog entry, noting no user-initiated deletion flow exists in Phase 1 or 2 | §Abuse surface / §GDPR deferral |
| 6 | minor | "Index-only scan" in query patterns too | **folded**: removed | §Query patterns |
| 7 | minor | Policy DDL missing `DO $$` wrapper | **folded**: all 4 policies shown in explicit idempotent form | §RLS policies |
| 8 | minor | TOAST threshold rationale wrong | **folded**: corrected rationale | §DDL column table |
| 9 | minor | Open Q#2 misframes JSONB injection risk | **folded**: corrected framing, reconfirmed route-handler allowlist decision | §Abuse surface / §Resolved |
| Q1 | open | Title/body immutability | **resolved**: leave mutable (reviewer agrees with v1 lean) | §Resolved |
| Q2 | open | metadata freedom | **resolved**: route-handler allowlist in `feature/feedback-widget` | §Resolved |
| Q3 | open | `resolved_at` trigger vs route handler | **resolved**: route handler (reviewer agrees with v1 lean) | §Resolved |
| Q4 | open | `source_key` column | **resolved**: add now, see blocker 1 fold | §Resolved |
| Q5 | open | Durable spec storage | **resolved**: commit copy to `Docs/specs/2026-04-14-feedback-tickets.md` in implementation PR | §Resolved |
| Q6 | open | `check:schema-drift` scope | **resolved**: add both `feedback_tickets` AND `user_events` (pre-existing omission, trivially in-scope) | §Resolved |
| — | scope | `user_events` pre-existing drift gap | **folded**: included in schema-drift script update | §Scope additions |

## Goal

Create the `public.feedback_tickets` table + RLS + indexes + update-trigger that the remaining 4 Phase 2 branches all depend on. This is the Phase 2 foundation: one migration file, one small script update, no route handlers, no UI.

## Non-goals

- **Rate limiting** for the user_feedback insert path. Belongs in `feature/feedback-widget`.
- **GitHub Issues mirror**. `github_issue_url` column is reserved; actual `gh api` mirror lives in `feature/feedback-widget`.
- **Clustering / embeddings**. `cluster_key` reserved for Phase 7, no index yet.
- **Admin UI**. `/admin/tickets` page is its own branch.
- **Sentry webhook signature verification**. Lives in `feature/sentry-webhook-ingest` route handler.
- **Data migration / backfill**. New table.
- **Realtime subscription** for dashboard auto-refresh. Polling acceptable at triage traffic volume.
- **User-initiated account deletion flow**. Not in Phase 1 or 2 scope. GDPR erasure architecture deferred — see §GDPR deferral.

## Source of truth (verified from Explore + round-1 reviewer grounding)

- **`public.admin_users`** exists (`supabase/migrations/202604090001_admin_lockdown.sql:1-6`). Schema: `(user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`. RLS already enabled. Canonical admin check in server code: `isAdminUser` at `src/lib/admin-auth.ts:8-24`. DB-level check: `EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())`.

- **`public.users`** has `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` (`001_schema.sql:14-23`). Deleting an auth account cascades the public users row; feedback_tickets row survives via `ON DELETE SET NULL` on its FK.

- **`update_updated_at()` helper function** exists at `supabase/migrations/001_schema.sql:313-320`. We REUSE it — single source of truth.

- **Existing idempotent RLS policy pattern** (`202604100001_create_user_events.sql:39-52`): `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=? AND policyname=?) THEN CREATE POLICY ... END IF; END $$`. We mirror this for all 4 policies.

- **Existing enum-as-CHECK pattern**: `TEXT` + `CHECK (col IN ('a','b','c'))`. Canonical in `001_schema.sql` (`fights.status`, `predictions.method`, etc.). We follow this for all 3 enums (source, status, priority). Rationale: CHECK constraints evolve cheaply; native `CREATE TYPE ... AS ENUM` is painful to alter.

- **Post-convergence assertion pattern**: from `202604140001_scoring_v3_winner_only_2pts.sql` (shipped this session). Trailing `DO $$ ... RAISE EXCEPTION ... END $$` that tests the migration's invariant and rolls back the transaction on failure.

- **Supabase PG version**: 15+. Confirms `CREATE OR REPLACE TRIGGER` support (PG 14+ feature).

- **`reviews/` is gitignored** (`.gitignore:25`). Spec + review artifacts don't ship to git by default. Implementation PR will commit a durable copy to `Docs/specs/2026-04-14-feedback-tickets.md` per open Q5.

## Design

### Migration filename

`supabase/migrations/202604140002_create_feedback_tickets.sql`

Matches naming convention. `0002` because `0001` on 2026-04-14 is `scoring_v3_winner_only_2pts.sql`.

### Table DDL (v2)

```sql
CREATE TABLE IF NOT EXISTS public.feedback_tickets (
    id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID            REFERENCES public.users(id) ON DELETE SET NULL,
    source           TEXT            NOT NULL
                                     CHECK (source IN (
                                         'user_feedback',
                                         'sentry_error',
                                         'claude_autofix_failed',
                                         'analytics_anomaly'
                                     )),
    source_key       TEXT            NULL,
    status           TEXT            NOT NULL DEFAULT 'open'
                                     CHECK (status IN (
                                         'open',
                                         'triaged',
                                         'in_progress',
                                         'resolved',
                                         'wontfix'
                                     )),
    priority         TEXT            NOT NULL DEFAULT 'p3'
                                     CHECK (priority IN ('p0', 'p1', 'p2', 'p3')),
    title            TEXT            NOT NULL
                                     CHECK (char_length(title) BETWEEN 1 AND 200),
    body             TEXT            NOT NULL
                                     CHECK (char_length(body) BETWEEN 1 AND 8000),
    metadata         JSONB           NOT NULL DEFAULT '{}'::jsonb,
    github_issue_url TEXT            NULL
                                     CHECK (github_issue_url IS NULL
                                            OR github_issue_url ~ '^https://github\.com/[^/]+/[^/]+/issues/[0-9]+$'),
    cluster_key      TEXT            NULL,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    resolved_at      TIMESTAMPTZ     NULL
);
```

#### Column decisions (v2)

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | Primary key. |
| `user_id` | UUID | **NULL** | — | Nullable for anonymous feedback. `ON DELETE SET NULL` (ticket content survives user deletion for admin triage). GDPR caveat in §GDPR deferral. |
| `source` | TEXT | NOT NULL | — | CHECK on 4 reserved values. No default — inserter must declare. |
| `source_key` | TEXT | **NULL** | — | **NEW v2 (round 1 blocker 1 fold).** External dedup key — Sentry uses `sentry_issue_id`, `claude_autofix_failed` uses task id, `analytics_anomaly` uses metric+bucket. `user_feedback` leaves NULL. Enforced unique per source via partial UNIQUE index (see §Indexes). Route handler dedup is insufficient — Sentry retries webhooks on 5xx, and without DB-level unique enforcement every retry would silently insert a duplicate. |
| `status` | TEXT | NOT NULL | `'open'` | CHECK on 5 lifecycle values. |
| `priority` | TEXT | NOT NULL | `'p3'` | CHECK on 4 levels. Lexicographic sort matches severity (`'p0' < 'p1' < 'p2' < 'p3'`). |
| `title` | TEXT | NOT NULL | — | CHECK `char_length BETWEEN 1 AND 200`. |
| `body` | TEXT | NOT NULL | — | CHECK `char_length BETWEEN 1 AND 8000`. **v2**: rationale corrected — 8000 chars = up to ~24KB (Korean) which exceeds PG's ~2KB TOAST threshold and triggers TOAST storage. TOAST is transparent for TEXT and is expected, not a performance concern. The cap's purpose is abuse mitigation (unbounded payload DoS), not TOAST avoidance. |
| `metadata` | JSONB | NOT NULL | `'{}'::jsonb` | Opaque bag. Route-handler key allowlist enforces shape (per resolved open Q2). |
| `github_issue_url` | TEXT | NULL | — | CHECK regex matches `https://github.com/{owner}/{repo}/issues/{N}`. Populated by GH mirror in `feature/feedback-widget`. |
| `cluster_key` | TEXT | NULL | — | Phase 7 reserved. No index yet. |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Append-only. |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Trigger-updated on UPDATE. |
| `resolved_at` | TIMESTAMPTZ | NULL | — | Route-handler-set on status transition to `resolved`/`wontfix`. No trigger (per resolved open Q3). |

### Indexes (v2)

```sql
-- Admin dashboard primary query: "open tickets by priority, newest first"
-- Shape: WHERE status = 'open' AND priority = 'p0' ORDER BY created_at DESC
-- Or:    WHERE status = 'open' ORDER BY priority ASC, created_at DESC
--
-- The composite (status, priority, created_at DESC) serves both queries via
-- INDEX RANGE SCAN, avoiding filesort. Full-row heap fetches are required
-- for title/body/metadata/user_id/source; the index does NOT cover these
-- columns (this is intentional — covering would multiply write cost).
-- This is NOT an index-only scan; it is an index range scan with heap
-- access. See round-1 reviewer walk-through #3 for the full plan analysis.
CREATE INDEX IF NOT EXISTS idx_feedback_tickets_triage
    ON public.feedback_tickets (status, priority, created_at DESC);

-- Per-user lookup: admin triage wants "show this user's feedback history"
-- WHERE user_id = $1 ORDER BY created_at DESC
-- Partial (WHERE user_id IS NOT NULL) keeps anon-ticket rows out of the index.
CREATE INDEX IF NOT EXISTS idx_feedback_tickets_user
    ON public.feedback_tickets (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

-- Sentry dedup lookup: the webhook ingester checks "has this Sentry
-- issue.id already been ingested?" before insert. Partial on source.
-- This index supports the LOOKUP; the UNIQUE enforcement is separate below.
CREATE INDEX IF NOT EXISTS idx_feedback_tickets_sentry_issue
    ON public.feedback_tickets ((metadata->>'sentry_issue_id'))
    WHERE source = 'sentry_error';

-- Unique enforcement for external dedup keys (v2 blocker 1 fold):
-- Prevents duplicate ticket creation on Sentry webhook retry, Claude autofix
-- retry, analytics anomaly re-detection, etc. user_feedback rows leave
-- source_key NULL and are excluded from the constraint via the partial index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_tickets_source_key_uniq
    ON public.feedback_tickets (source, source_key)
    WHERE source_key IS NOT NULL;
```

**No index on `cluster_key`** — reserved. Phase 7 clustering job will add it.

### Trigger (v2)

```sql
-- Reuse existing update_updated_at() from 001_schema.sql:313-320
-- CREATE OR REPLACE TRIGGER (PG 14+, Supabase PG 15+) for idempotency.
-- Plain CREATE TRIGGER does NOT support IF NOT EXISTS and would fail on re-run.
CREATE OR REPLACE TRIGGER trg_feedback_tickets_updated_at
    BEFORE UPDATE ON public.feedback_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### RLS policies (v2 — all 4 shown in explicit idempotent form)

```sql
ALTER TABLE public.feedback_tickets ENABLE ROW LEVEL SECURITY;

-- Policy 1: anon + authenticated INSERT, but ONLY with source='user_feedback'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'feedback_tickets'
          AND policyname = 'feedback_tickets_user_insert'
    ) THEN
        CREATE POLICY "feedback_tickets_user_insert"
            ON public.feedback_tickets
            FOR INSERT
            TO anon, authenticated
            WITH CHECK (
                source = 'user_feedback'
                AND (
                    (auth.uid() IS NULL AND user_id IS NULL)
                    OR
                    (auth.uid() IS NOT NULL AND user_id = auth.uid())
                )
                AND source_key IS NULL
            );
    END IF;
END $$;

-- Policy 2: admin-only SELECT (triage dashboard)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'feedback_tickets'
          AND policyname = 'feedback_tickets_admin_select'
    ) THEN
        CREATE POLICY "feedback_tickets_admin_select"
            ON public.feedback_tickets
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.admin_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy 3: admin-only UPDATE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'feedback_tickets'
          AND policyname = 'feedback_tickets_admin_update'
    ) THEN
        CREATE POLICY "feedback_tickets_admin_update"
            ON public.feedback_tickets
            FOR UPDATE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.admin_users
                    WHERE user_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.admin_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy 4: admin-only DELETE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'feedback_tickets'
          AND policyname = 'feedback_tickets_admin_delete'
    ) THEN
        CREATE POLICY "feedback_tickets_admin_delete"
            ON public.feedback_tickets
            FOR DELETE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.admin_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
END $$;
```

**Policy 1 additional clause in v2**: `AND source_key IS NULL` — prevents an authenticated user from claiming a `user_feedback` row with a `source_key` that could collide with a future machine-ingested source's unique key. Machine-ingested sources (Sentry, Claude autofix, analytics) bypass RLS via service_role and supply their own `source_key`; user feedback never needs a `source_key` and must not be allowed to set one.

**No INSERT policy for `source != 'user_feedback'`**: all machine-ingested sources use service_role which bypasses RLS. A compromised admin account cannot forge sentry_error / claude_autofix_failed / analytics_anomaly tickets via the regular auth path. This is intentional — service_role is the right privilege boundary for machine-to-DB writes.

### Post-convergence assertions (v2 — extended to 10 checks)

```sql
DO $$
DECLARE
    v_rls_enabled BOOLEAN;
    v_test_id UUID;
    v_error_caught BOOLEAN := false;
BEGIN
    -- Assertion 1: table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'feedback_tickets'
    ) THEN
        RAISE EXCEPTION 'feedback_tickets table does not exist';
    END IF;

    -- Assertion 2: RLS enabled
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relname = 'feedback_tickets' AND relnamespace = 'public'::regnamespace;
    IF NOT v_rls_enabled THEN
        RAISE EXCEPTION 'feedback_tickets: RLS is not enabled';
    END IF;

    -- Assertion 3: all 4 policies exist by name
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feedback_tickets' AND policyname='feedback_tickets_user_insert') THEN
        RAISE EXCEPTION 'feedback_tickets_user_insert policy missing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feedback_tickets' AND policyname='feedback_tickets_admin_select') THEN
        RAISE EXCEPTION 'feedback_tickets_admin_select policy missing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feedback_tickets' AND policyname='feedback_tickets_admin_update') THEN
        RAISE EXCEPTION 'feedback_tickets_admin_update policy missing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feedback_tickets' AND policyname='feedback_tickets_admin_delete') THEN
        RAISE EXCEPTION 'feedback_tickets_admin_delete policy missing';
    END IF;

    -- Assertion 4: trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_feedback_tickets_updated_at'
          AND tgrelid = 'public.feedback_tickets'::regclass
    ) THEN
        RAISE EXCEPTION 'trg_feedback_tickets_updated_at trigger missing';
    END IF;

    -- Assertion 5: idx_feedback_tickets_triage exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname='public' AND tablename='feedback_tickets' AND indexname='idx_feedback_tickets_triage'
    ) THEN
        RAISE EXCEPTION 'idx_feedback_tickets_triage missing';
    END IF;

    -- Assertion 6: idx_feedback_tickets_user exists (v2 major 1 fold)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname='public' AND tablename='feedback_tickets' AND indexname='idx_feedback_tickets_user'
    ) THEN
        RAISE EXCEPTION 'idx_feedback_tickets_user missing';
    END IF;

    -- Assertion 7: idx_feedback_tickets_sentry_issue exists (v2 major 1 fold)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname='public' AND tablename='feedback_tickets' AND indexname='idx_feedback_tickets_sentry_issue'
    ) THEN
        RAISE EXCEPTION 'idx_feedback_tickets_sentry_issue missing';
    END IF;

    -- Assertion 8: idx_feedback_tickets_source_key_uniq exists (v2 blocker 1 fold)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname='public' AND tablename='feedback_tickets' AND indexname='idx_feedback_tickets_source_key_uniq'
    ) THEN
        RAISE EXCEPTION 'idx_feedback_tickets_source_key_uniq missing';
    END IF;

    -- Assertion 9: positive-path INSERT accepts valid source
    INSERT INTO public.feedback_tickets (source, title, body)
    VALUES ('user_feedback', '__assertion_test__', '__assertion_body__')
    RETURNING id INTO v_test_id;
    DELETE FROM public.feedback_tickets WHERE id = v_test_id;

    -- Assertion 10: negative-path INSERT rejects invalid source (v2 major 1 fold)
    BEGIN
        INSERT INTO public.feedback_tickets (source, title, body)
        VALUES ('__not_a_valid_source__', '__assertion_test__', '__assertion_body__');
    EXCEPTION WHEN check_violation THEN
        v_error_caught := true;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'feedback_tickets CHECK(source) is not enforcing enum';
    END IF;
END $$;
```

### Schema drift script update (v2 scope addition)

`scripts/check-schema-drift.mjs` currently checks 8 tables. The implementation PR adds:

```js
// Existing CRITICAL_TABLES array gets extended:
const CRITICAL_TABLES = [
    "users",
    "admin_users",
    "events",
    "fights",
    "predictions",
    "fighters",
    "fighter_comments",
    "user_events",         // v2: pre-existing omission — shipped in 202604100001 but never added to drift check
    "feedback_tickets"     // v2: new from this branch
];
```

Both additions land in the same PR. `user_events` is a free pickup of a pre-existing gap surfaced by round 1.

## Abuse surface (v2 — updated risk framing)

First BlackPick surface that anonymous, unauthenticated POSTs can write into. Abuse model:

| Vector | Mitigation in this branch | Mitigation in later branch |
|---|---|---|
| **Spam flood** (10k tickets/sec) | — | Rate limiting in `feature/feedback-widget` route handler (IP + session) |
| **Large payload DoS** | `CHECK (char_length(body) BETWEEN 1 AND 8000)` + `CHECK (char_length(title) BETWEEN 1 AND 200)` | — |
| **Unbounded metadata payload** (100-key `metadata` with MB-size screenshot data URLs) | — | Route-handler key allowlist in `feature/feedback-widget` (`page_url`, `user_agent`, `screenshot_url`, `category`); screenshot URLs restricted to Vercel Blob paths |
| **Forged source** (anon posts `source='sentry_error'`) | Policy 1 `WITH CHECK (source = 'user_feedback')` | — |
| **Forged `user_id`** (anon claims a target user ID) | Policy 1 `WITH CHECK (auth.uid() IS NULL AND user_id IS NULL)` or `(auth.uid() = user_id)` | — |
| **Forged `source_key` collision** (auth user sets source_key to collide with machine source unique index) | Policy 1 `WITH CHECK (source_key IS NULL)` (v2) | — |
| **Forged `github_issue_url`** (phishing link) | `CHECK (github_issue_url ~ regex)` | — |
| **Admin account compromise → forge sentry tickets** | No INSERT policy covers non-`user_feedback` source for regular auth; service_role is the only path | — |
| **Metadata JSONB as markup injection** (admin UI rendering metadata as HTML) | — | Admin UI treats metadata as opaque data, never renders as HTML. Called out in `feature/admin-tickets-dashboard` spec |
| **Sentry webhook retry → duplicate tickets** (v2 blocker 1 fold) | `UNIQUE (source, source_key) WHERE source_key IS NOT NULL` prevents at DB level | — |

## GDPR deferral (v2 major 3 fold — Option C)

**Decision**: BlackPick does not yet have a user-initiated account deletion flow. It is not in Phase 1 or Phase 2 scope. The architectural decision on how to handle `user_feedback` rows when a user deletes their account is **deferred** to the phase where user-initiated deletion ships.

This branch ships with `ON DELETE SET NULL` on `user_id`. The consequence: if a user's public users row is ever deleted (currently only possible via admin service_role action), their `feedback_tickets` rows survive with `user_id = NULL`, retaining `title`, `body`, and `metadata` contents. Body may contain PII submitted by the user.

Under Korean PIPA (applies to blackpick.io) and GDPR (applies via any EU visitor), users have a right to erasure that covers data they voluntarily submitted. When BlackPick ships user-initiated account deletion, that flow MUST either:

- A) `ON DELETE CASCADE` for `source = 'user_feedback'` rows (requires app-level logic, FKs can't filter by column value)
- B) Trigger on `user_id` null-set that anonymizes `body`/`title` for `user_feedback` rows (DB-level)
- C) Admin-facing redaction workflow that the user deletion flow invokes

**TASKS.md backlog entry added in implementation PR**: "Phase X — user account deletion + PIPA/GDPR erasure for `feedback_tickets.user_feedback` rows. Depends on `feature/account-deletion` branch shipping first. See `Docs/specs/2026-04-14-feedback-tickets.md §GDPR deferral` for the architecture options."

## Query patterns (v2 — index-only claims removed)

1. **Open ticket queue, priority-then-date** — `WHERE status = 'open' ORDER BY priority ASC, created_at DESC`. Serves via `idx_feedback_tickets_triage` index range scan + heap fetches. Filesort avoided.
2. **Filter by specific status + priority** — `WHERE status = $1 AND priority = $2 ORDER BY created_at DESC`. Same index, tighter equality prefix.
3. **Per-user lookup** — `WHERE user_id = $1 ORDER BY created_at DESC`. Serves via `idx_feedback_tickets_user` (partial).
4. **Sentry dedup lookup** — `SELECT 1 FROM feedback_tickets WHERE source='sentry_error' AND metadata->>'sentry_issue_id' = $1`. Serves via `idx_feedback_tickets_sentry_issue` (partial expression).
5. **Sentry dedup enforcement** — DB-level `UNIQUE (source, source_key) WHERE source_key IS NOT NULL` catches any race the route handler misses.
6. **Ticket detail by id** — `WHERE id = $1`. Primary key.

No query runs without an index. No index-only scans — the dashboard queries touch non-indexed columns and require heap fetches, which is correct and expected.

## Test matrix (next session — implementation PR)

Implementation PR will add tests in (new file) `src/lib/feedback-validation.test.ts` (pure validator) + migration assertions in-file.

Pure helper extraction pattern per Branch 8 lesson:

- Extract `validateFeedbackPayload({title, body, source, user_id, metadata})` in `src/lib/feedback-validation.ts`. Unit tests cover:
  - Empty/whitespace title → reject
  - 201-char title → reject
  - 1-char title → accept
  - 8001-char body → reject
  - Valid anon shape (user_id null, source='user_feedback', metadata allowlist) → accept
  - Valid authed shape → accept
  - Authed with mismatched user_id → reject
  - Forged source (`'sentry_error'`, `'admin_note'`) → reject
  - Non-allowlisted metadata key (`sentry_issue_id`, `admin_hint`, arbitrary) → reject (route-handler filter, tested here)
  - Metadata with oversized screenshot_url (> Vercel Blob max) → reject
  - CRLF injection in title → sanitized
  - Null bytes in body → rejected
  - Unicode control chars → stripped
  - Valid submission with all fields → accept
  - Empty metadata → accept (defaults to `{}`)

Test count target: ~15 new cases → total ~181/181.

## Rollback plan

```sql
-- Rollback migration (NOT shipped in-tree — kept in review artifacts only)
-- Execute manually if PROD apply fails catastrophically.
DROP TABLE IF EXISTS public.feedback_tickets CASCADE;
```

**The migration is idempotent** (v2). Every `CREATE TABLE`/`CREATE INDEX`/`CREATE UNIQUE INDEX` uses `IF NOT EXISTS`. Every policy is wrapped in a `DO $$ IF NOT EXISTS` guard. The trigger uses `CREATE OR REPLACE TRIGGER` (PG 14+). Re-running the migration on a database where it already applied is a no-op, verified by the trailing assertion block.

## Deployment plan

1. ~~Ship the spec (this file)~~ **this file is the fold artifact. The durable copy lands as `Docs/specs/2026-04-14-feedback-tickets.md` in the implementation PR.**
2. ~~Round 1 review~~ **done — see `01-round1-review.md` in this dir.**
3. ~~Round 1 fold~~ **done — this file.**
4. **Next session**: implementation PR on the `db/feedback-tickets` branch:
   - Write `supabase/migrations/202604140002_create_feedback_tickets.sql` from this v2 spec
   - Write `src/lib/feedback-validation.ts` + `.test.ts`
   - Update `scripts/check-schema-drift.mjs` to include `user_events` + `feedback_tickets`
   - Update TASKS.md (mark `db/feedback-tickets` as in-progress → shipped; add GDPR deferral backlog entry)
   - Commit durable spec copy to `Docs/specs/2026-04-14-feedback-tickets.md`
   - Run gates (check:i18n, check:schema-drift, test:fast, build)
   - Local DEV apply via `supabase db query --linked --file` (re-link round-trip)
   - Verify post-convergence assertions pass on DEV
   - PR against develop, round-2 review (implementation phase)
5. **Phase 6 release bundle**: PROD apply happens with the rest of the develop→main release.

## Resolved (v2 — all 6 round-1 open questions closed)

| Q | Decision | Location |
|---|---|---|
| 1. Title/body immutability | **Leave mutable.** Admin is only writer, legitimate redaction use case, immutability trigger adds complexity for marginal audit benefit. If needed later, ship separate `feedback_ticket_edits` audit log table. | §RLS policies Policy 3 |
| 2. Metadata freedom | **Route-handler allowlist, no DB CHECK.** `feature/feedback-widget` enforces `{page_url, user_agent, screenshot_url, category}` allowlist. DB stores opaque JSONB. Risk framing corrected from v1 (dedup injection is already mitigated by partial index scope). | §Abuse surface, §Test matrix |
| 3. `resolved_at` trigger vs route handler | **Route handler.** Single admin write path exists; explicit set is simpler and testable. | §DDL column table |
| 4. `source_key` column | **Add now** (blocker 1 fold). Top-level column + `UNIQUE (source, source_key) WHERE source_key IS NOT NULL` partial index. | §DDL, §Indexes, §RLS |
| 5. Durable spec storage | **Commit to `Docs/specs/2026-04-14-feedback-tickets.md`** in implementation PR. | §Deployment plan |
| 6. `check:schema-drift` scope | **Add both `feedback_tickets` AND `user_events`** (pre-existing omission). | §Schema drift script update |

## Open questions for Sean (product scope — unchanged from v1)

1. **GDPR "right to erasure"**: v2 deferral to user-initiated account deletion flow (Option C). Confirm this is acceptable given the current launch timeline. If Sean wants an earlier mitigation path, we'd reopen and pick A or B.
2. **Should users be able to see their own submitted tickets?** Current design: no (fire-and-forget widget). If yes, we add a 5th policy: `feedback_tickets_user_select_own` with `USING (auth.uid() IS NOT NULL AND user_id = auth.uid())`. **This is a product decision** — leaving it out keeps the widget simpler but means no "my feedback history" view.

Both are product decisions that don't block the migration file but should be answered before `feature/feedback-widget` writes its UI.

## Cross-family review recommendation (from round 1 blindspot caveat)

The round-1 reviewer noted that spec-author and spec-reviewer share training weights (`second-opinion-reviewer` is a Sonnet/Opus subagent, I am Opus). The RLS policy block in particular is the class of code where that shared-weight bias matters most — a consistent misunderstanding of Supabase JWT role mapping or PG `TO anon, authenticated` semantics would be reproduced in both the spec and the review.

**Recommendation**: before PROD apply of the implementation PR, run a cross-family review (GPT / Gemini / Codex) on the `.sql` file, scoped to the RLS policy block only. The cost is bounded (one review call, one artifact), the stakes are high (auth bypass in a user-writable table would be shipped), and the `blackpick_max` review profile precisely calls out this class of concern.

This recommendation **does not block merging the spec fold** — it applies to the implementation PR, before PROD apply. The implementation PR round 2 review remains the primary gate.

## Summary of v2 changes from v1

- **Added**: `source_key` column + unique partial index (blocker 1)
- **Fixed**: `CREATE TRIGGER` → `CREATE OR REPLACE TRIGGER` (blocker 2)
- **Extended**: post-convergence assertion block from 6 to 10 checks including all 4 indexes + negative-path INSERT test (major 1)
- **Corrected**: "index-only scan" language removed from both `§Indexes` comment and `§Query patterns` (major 2 + minor 1)
- **Resolved**: GDPR erasure → Option C + TASKS.md backlog entry (major 3)
- **Rewritten**: all 4 RLS policies in explicit `DO $$ IF NOT EXISTS` idempotent form (minor 2)
- **Corrected**: TOAST threshold rationale (minor 3)
- **Corrected**: Open Q#2 risk framing (minor 4)
- **Resolved**: all 6 reviewer open questions
- **Added scope**: `user_events` added to `check:schema-drift` alongside `feedback_tickets` (pre-existing gap)
- **Policy 1 hardened**: added `AND source_key IS NULL` clause to prevent authed users from colliding with machine-source unique keys
- **Added**: cross-family review recommendation for implementation PR RLS block
