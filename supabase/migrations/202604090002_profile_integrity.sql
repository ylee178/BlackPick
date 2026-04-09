ALTER TABLE public.comment_translations
    DROP CONSTRAINT IF EXISTS comment_translations_target_locale_check;

ALTER TABLE public.comment_translations
    ADD CONSTRAINT comment_translations_target_locale_check
    CHECK (target_locale IN ('en', 'ko', 'ja', 'es', 'zh-CN', 'mn', 'pt-BR'));

CREATE TABLE IF NOT EXISTS public.fighter_comment_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.fighter_comments(id) ON DELETE CASCADE,
    target_locale TEXT NOT NULL CHECK (target_locale IN ('en', 'ko', 'ja', 'es', 'zh-CN', 'mn', 'pt-BR')),
    translated_body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (comment_id, target_locale)
);

CREATE INDEX IF NOT EXISTS idx_fighter_comment_translations_comment
    ON public.fighter_comment_translations(comment_id);

ALTER TABLE public.fighter_comment_translations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'fighter_comment_translations'
          AND policyname = 'fighter_comment_translations_select'
    ) THEN
        CREATE POLICY "fighter_comment_translations_select"
            ON public.fighter_comment_translations
            FOR SELECT
            USING (true);
    END IF;
END
$$;
