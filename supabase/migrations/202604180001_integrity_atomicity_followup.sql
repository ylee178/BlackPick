-- 202604180001 — Integrity/atomicity follow-on hardening (Codex PR #30 deferred items)
--
-- Six follow-on items Codex CLI flagged but deferred in PR #30 (non-blocking),
-- plus fold-in of round-1 second-opinion-reviewer findings (see
-- `reviews/BlackPick/2026-04-17_integrity-followup_dialog/`).
--
-- Scope: RPC hardening, documentation of invariants, search_path pins,
-- REVOKE-from-PUBLIC on SECURITY DEFINER scoring RPCs. No schema changes.
--
-- Items:
--   1. [major] reset_user_record: close DELETE/UPDATE race under READ COMMITTED
--              (table locks extended from `predictions` alone to all 5 tables
--              the function mutates — round-1 finding)
--   2. [major] admin_process_fight_result: document dual-guard invariant
--   3. [minor] process_fight_result: pin search_path + REVOKE from PUBLIC
--              (REVOKE is NEW — round-1 oracle caught a missing grant-lockdown)
--   4. [minor] comment_likes: document intentional UPDATE-policy absence
--   5. [minor] events.completed_at: document backfill-vs-trigger semantic split
--   6. [major] recalculate_all_scores: same hardening as #3
--              (NEW in fold — round-1 oracle + forensic caught same defect class)
--   7. (test-only, not in this migration) mvp-vote-window invalid-date coverage
--
-- DANGER note on ALTER FUNCTION SET search_path: PostgreSQL stores this in
-- pg_proc.proconfig. A subsequent CREATE OR REPLACE FUNCTION that omits
-- `SET search_path` SILENTLY CLEARS the pin. Any future migration that
-- re-defines `process_fight_result` or `recalculate_all_scores` MUST
-- include `SET search_path = public, pg_temp` in the definition, or the
-- hardening from this migration is lost.
--
-- Idempotent — re-run safe. No breaking contract changes.

--------------------------------------------------------------------------------
-- Item 1: reset_user_record atomic-reset lock
--
-- Under READ COMMITTED, a concurrent INSERT into public.predictions for the
-- same user_id can land between this function's DELETE and UPDATE, and a
-- concurrent INSERT ON CONFLICT DO UPDATE by `process_fight_result` can
-- re-populate `user_weight_class_stats`, `hall_of_fame_entries`, or
-- `perfect_card_entries` after we deleted the user's rows from them.
--
-- Caller context: POST /api/profile/reset-record is USER-FACING — any
-- authenticated user can reset their own record. The route uses
-- createSupabaseAdmin() to invoke the SECURITY DEFINER RPC via service_role,
-- but that is the DB-client choice, NOT an endpoint access restriction.
-- No rate limiter is currently applied on the route (tracked separately as
-- a Phase 6 pre-launch hardening item). Contention is expected to be low
-- (reset is a rare UX action) but the lock is the correct mechanism at
-- any frequency since advisory locks would require opt-in from
-- /api/predictions which does not take one.
--
-- Fix: LOCK TABLE ... IN SHARE ROW EXCLUSIVE MODE on all 5 tables the
-- function mutates. SHARE ROW EXCLUSIVE conflicts with ROW EXCLUSIVE
-- (INSERT/UPDATE/DELETE) for the duration of the transaction while
-- permitting ACCESS SHARE (SELECT). Lock covers the full reset so a
-- concurrent reader cannot observe the partial-reset intermediate state,
-- and a concurrent `process_fight_result` cannot INSERT ON CONFLICT while
-- we are mid-delete.
--
-- Lock-order note: we always take locks in the same order (predictions →
-- user_weight_class_stats → hall_of_fame_entries → perfect_card_entries →
-- rankings). No other function in the project takes these locks in a
-- different order, so no deadlock cycle is possible.
--
-- Advisory-lock alternative (pg_advisory_xact_lock keyed on user_id) was
-- rejected: the INSERT path on /api/predictions does not take the same
-- advisory lock, so it would not actually serialize writes.
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reset_user_record(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Block concurrent writes to all 5 tables this function touches, for the
    -- duration of this transaction. See migration header (Item 1) for rationale.
    LOCK TABLE
        public.predictions,
        public.user_weight_class_stats,
        public.hall_of_fame_entries,
        public.perfect_card_entries,
        public.rankings
        IN SHARE ROW EXCLUSIVE MODE;

    DELETE FROM public.predictions
    WHERE user_id = p_user_id;

    DELETE FROM public.user_weight_class_stats
    WHERE user_id = p_user_id;

    DELETE FROM public.hall_of_fame_entries
    WHERE user_id = p_user_id;

    DELETE FROM public.perfect_card_entries
    WHERE user_id = p_user_id;

    DELETE FROM public.rankings
    WHERE user_id = p_user_id;

    UPDATE public.users
    SET score = 0,
        wins = 0,
        losses = 0,
        current_streak = 0,
        best_streak = 0,
        hall_of_fame_count = 0,
        p4p_score = 0
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.reset_user_record(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_user_record(UUID) TO service_role;

--------------------------------------------------------------------------------
-- Item 2: admin_process_fight_result dual-guard invariant documentation
--
-- The wrapper calls process_fight_result at the end; the inner function
-- does its own `result_processed_at IS NOT NULL` check and sets the column
-- at the end. The wrapper's FOR UPDATE row lock + pre-check means by the
-- time PERFORM fires, no other caller can race.
--
-- The obvious fix ("also set result_processed_at in the wrapper before
-- PERFORM") would break the inner function: process_fight_result RAISES
-- EXCEPTION when result_processed_at IS NOT NULL. Prior-round Codex review
-- on PR #30 actually caught this in a fold attempt (see
-- reviews/BlackPick/2026-04-17_codex-integrity-round2_dialog/).
-- So the resolution here is documentation-only.
--------------------------------------------------------------------------------

COMMENT ON FUNCTION public.admin_process_fight_result(UUID, UUID, TEXT, INT) IS
    'Admin-only atomic wrapper over process_fight_result. '
    'Takes SELECT FOR UPDATE row lock on fights, pre-checks result_processed_at, '
    'validates method/round/winner, then UPDATEs fight fields and PERFORMs '
    'process_fight_result. The inner function re-checks result_processed_at and '
    'sets it at the end of its run — do NOT set result_processed_at in this '
    'wrapper, as doing so would trip the inner function''s duplicate-processing '
    'guard. Dual guard = row lock (prevents concurrent wrappers) + inner guard '
    '(defense-in-depth against direct callers of process_fight_result).';

COMMENT ON FUNCTION public.process_fight_result(UUID) IS
    'Scoring engine. Idempotent via result_processed_at guard (RAISES if set). '
    'Normally invoked by admin_process_fight_result wrapper which already holds '
    'a row lock on the fight. Direct callers (recalculate_all_scores, CLI '
    'recovery scripts via service_role) rely on the inner guard alone, so the '
    'check must remain. REVOKEd from PUBLIC in this migration (202604180001) — '
    'prior state was implicit PUBLIC EXECUTE from the default CREATE FUNCTION '
    'grant. See Item 3 rationale.';

--------------------------------------------------------------------------------
-- Item 3: process_fight_result search_path pin + grant-lockdown
--
-- Pre-existing SECURITY DEFINER function from 202604090001 was created without
-- `SET search_path = public, pg_temp` AND without a REVOKE FROM PUBLIC — the
-- round-1 oracle reviewer caught both gaps. Both must be closed.
--
-- ALTER FUNCTION avoids re-stating the 200-line function body for the
-- search_path pin. REVOKE + GRANT is orthogonal DDL.
--
-- DANGER: pg_proc.proconfig is REPLACED (not merged) on CREATE OR REPLACE
-- FUNCTION. If any future migration re-defines process_fight_result, it
-- MUST include `SET search_path = public, pg_temp` in the definition or
-- this pin is silently lost. Same trap applies to the REVOKE — CREATE OR
-- REPLACE does not re-run the implicit default GRANT, but a DROP + CREATE
-- would, so prefer CREATE OR REPLACE and re-state REVOKE on any future
-- redefinition.
--------------------------------------------------------------------------------

ALTER FUNCTION public.process_fight_result(UUID) SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.process_fight_result(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_fight_result(UUID) TO service_role;

--------------------------------------------------------------------------------
-- Item 4: comment_likes intentional UPDATE-policy absence
--
-- The 202604170002 migration creates SELECT, INSERT, DELETE policies for
-- comment_likes but no UPDATE policy — by design. Likes have no mutable fields
-- from the client's perspective (comment_id, user_id are PK; created_at is
-- server-set). Unliking is a DELETE + re-INSERT, never an UPDATE.
--
-- Document this so a future contributor doesn't silently add an UPDATE policy
-- assuming it was an oversight.
--------------------------------------------------------------------------------

COMMENT ON TABLE public.comment_likes IS
    'Fight comment likes (comment_id, user_id) PK. '
    'Policies: SELECT (all), INSERT (user_id = auth.uid()), DELETE (user_id = auth.uid()). '
    'UPDATE-policy intentionally omitted — there are no mutable columns '
    'visible to the client, and unlike/relike flows are DELETE + INSERT, not '
    'UPDATE. Do not add an UPDATE policy without a concrete use case.';

--------------------------------------------------------------------------------
-- Item 5: events.completed_at semantic split
--
-- The 202604170001 migration populated completed_at two ways:
--   * Backfill (historical rows): COALESCE(MAX(fights.start_time), end-of-KST-event-day)
--   * Trigger (going forward):    now() when status transitions → completed
--
-- These diverge intentionally: historical data lacks an admin-action timestamp,
-- so start_time of the last fight is the best proxy. Going forward, the admin
-- action itself is the semantic anchor. Document the split to prevent confusion
-- when the two formulas produce different deadlines on similar-looking rows.
--------------------------------------------------------------------------------

COMMENT ON COLUMN public.events.completed_at IS
    'When the event was marked completed. Anchors the 24h MVP voting window. '
    'Historical rows (backfilled 202604170001) use COALESCE(MAX(fights.start_time), '
    'end-of-KST-event-day-minus-1ms) as a proxy since no admin-action timestamp '
    'exists. Rows completed after 2026-04-17 use now() via trg_events_completed_at. '
    'The split is intentional — do not unify by re-running the backfill.';

--------------------------------------------------------------------------------
-- Item 6: recalculate_all_scores hardening (NEW — round-1 fold)
--
-- Same defect class as Item 3: SECURITY DEFINER function from 202604090001
-- defined without `SET search_path` and without a REVOKE FROM PUBLIC.
-- recalculate_all_scores is a full-score-replay admin tool — zeroes all
-- user aggregates, truncates the auxiliary score tables, then replays
-- process_fight_result for every completed fight in start_time order.
-- An authenticated caller reaching this via PostgREST RPC would trigger
-- a full re-scoring and temporarily zero every user's score.
--
-- Close the same two gaps: pin search_path, revoke PUBLIC, grant service_role.
--------------------------------------------------------------------------------

ALTER FUNCTION public.recalculate_all_scores() SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.recalculate_all_scores() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_all_scores() TO service_role;

COMMENT ON FUNCTION public.recalculate_all_scores() IS
    'Full score replay — zeroes all user aggregates, TRUNCATEs the auxiliary '
    'score tables (user_weight_class_stats, hall_of_fame_entries, '
    'perfect_card_entries), then calls process_fight_result for every completed '
    'fight in start_time order. SECURITY DEFINER, service_role only. Use via '
    'admin CLI or psql; never exposed to authenticated users. '
    'LIVENESS WARNING: TRUNCATE takes ACCESS EXCLUSIVE which conflicts with '
    'the SHARE ROW EXCLUSIVE lock held by reset_user_record. Do not run this '
    'function while the app is serving live user traffic — a concurrent user '
    'calling POST /api/profile/reset-record will block for the full replay '
    'duration (potentially tens of seconds).';
