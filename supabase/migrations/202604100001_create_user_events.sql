-- user_events: single append-only table for all client-side analytics events.
-- Design principle: capture first, analyze later. FK constraints are omitted
-- intentionally to ensure inserts never fail due to referential integrity
-- violations — losing event data is worse than dangling references.

CREATE TABLE IF NOT EXISTS public.user_events (
    id          UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID,
    session_id  TEXT            NOT NULL,
    event_type  TEXT            NOT NULL,
    fight_id    UUID,
    event_id    UUID,
    metadata    JSONB           NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Query patterns:
-- 1. "All events for a user, newest first" → (user_id, created_at desc)
-- 2. "All events of type X in time range"  → (event_type, created_at desc)
-- 3. "All events for an event + type"      → (event_id, event_type)
-- 4. "Session timeline"                    → (session_id)
CREATE INDEX IF NOT EXISTS idx_user_events_user_time
    ON public.user_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_events_type_time
    ON public.user_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_events_event_type
    ON public.user_events (event_id, event_type);

CREATE INDEX IF NOT EXISTS idx_user_events_session
    ON public.user_events (session_id);

-- RLS: anyone can INSERT (including anonymous sessions), only service_role
-- can SELECT/UPDATE/DELETE. This prevents users from reading each other's
-- analytics data while ensuring the fire-and-forget logEvent() never fails.
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'user_events'
          AND policyname = 'user_events_insert_all'
    ) THEN
        CREATE POLICY "user_events_insert_all"
            ON public.user_events
            FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;
