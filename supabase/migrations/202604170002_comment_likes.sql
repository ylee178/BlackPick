CREATE TABLE IF NOT EXISTS public.comment_likes (
    comment_id UUID NOT NULL REFERENCES public.fight_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'comment_likes'
          AND policyname = 'comment_likes_select'
    ) THEN
        CREATE POLICY "comment_likes_select"
            ON public.comment_likes
            FOR SELECT
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'comment_likes'
          AND policyname = 'comment_likes_insert'
    ) THEN
        CREATE POLICY "comment_likes_insert"
            ON public.comment_likes
            FOR INSERT
            WITH CHECK (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'comment_likes'
          AND policyname = 'comment_likes_delete'
    ) THEN
        CREATE POLICY "comment_likes_delete"
            ON public.comment_likes
            FOR DELETE
            USING (user_id = auth.uid());
    END IF;
END
$$;
