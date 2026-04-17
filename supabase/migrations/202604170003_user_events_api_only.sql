-- Analytics writes should go through the app's API route so rate limiting and
-- server-side field normalization cannot be bypassed with a direct anon-key
-- insert from the client.
DROP POLICY IF EXISTS "user_events_insert_all" ON public.user_events;
