-- Manual remote rollout for environments where `supabase db push` cannot connect.
-- Run this in the Supabase SQL Editor against the production project.
-- After it succeeds, verify with:
--   npm run ops:remote:verify
-- If you also have CLI connectivity, repair the migration history with:
--   supabase migration repair 004 --status applied --linked --yes
--   supabase migration repair 202604090001 --status applied --linked --yes
--   supabase migration repair 202604090002 --status applied --linked --yes

BEGIN;

-- 004_preferred_language.sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT NULL;

COMMENT ON COLUMN public.users.preferred_language IS 'User preferred locale (en, ko, ja, es, zh-CN, mn)';

-- 202604090001_admin_lockdown.sql
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fights
    ADD COLUMN IF NOT EXISTS result_processed_at TIMESTAMPTZ;

UPDATE public.fights f
SET result_processed_at = now()
WHERE f.status = 'completed'
  AND f.result_processed_at IS NULL
  AND EXISTS (
      SELECT 1
      FROM public.predictions p
      WHERE p.fight_id = f.id
        AND (
            p.score IS NOT NULL
            OR p.is_winner_correct IS NOT NULL
            OR p.is_method_correct IS NOT NULL
            OR p.is_round_correct IS NOT NULL
        )
  );

CREATE OR REPLACE FUNCTION process_fight_result(p_fight_id UUID) RETURNS void AS $$
DECLARE
    v_fight RECORD;
    v_pred RECORD;
    v_streak_mult NUMERIC;
    v_final_score INT;
    v_weight_class TEXT;
    v_total_predictors INT;
    v_correct_predictors INT;
    v_correct_pct FLOAT;
    v_event_id UUID;
    v_event_fights INT;
BEGIN
    SELECT *
    INTO v_fight
    FROM fights
    WHERE id = p_fight_id
      AND status = 'completed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fight not found or not completed';
    END IF;

    IF v_fight.result_processed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Fight result already processed';
    END IF;

    v_event_id := v_fight.event_id;

    SELECT COALESCE(fa.weight_class, fb.weight_class, '기타')
    INTO v_weight_class
    FROM fighters fa, fighters fb
    WHERE fa.id = v_fight.fighter_a_id
      AND fb.id = v_fight.fighter_b_id;

    FOR v_pred IN SELECT * FROM predictions WHERE fight_id = p_fight_id LOOP
        UPDATE predictions
        SET is_winner_correct = (winner_id = v_fight.winner_id),
            is_method_correct = CASE
                WHEN method IS NOT NULL THEN (method = v_fight.method)
                ELSE NULL
            END,
            is_round_correct = CASE
                WHEN round IS NOT NULL THEN (round = v_fight.round)
                ELSE NULL
            END
        WHERE id = v_pred.id;
    END LOOP;

    UPDATE predictions
    SET score = calculate_prediction_score(
        is_winner_correct,
        method,
        is_method_correct,
        round,
        is_round_correct
    )
    WHERE fight_id = p_fight_id;

    FOR v_pred IN
        SELECT p.*, u.current_streak
        FROM predictions p
        JOIN users u ON u.id = p.user_id
        WHERE p.fight_id = p_fight_id
    LOOP
        IF v_pred.is_winner_correct THEN
            v_streak_mult := get_streak_multiplier(v_pred.current_streak);
            v_final_score := ROUND(v_pred.score * v_streak_mult)::INT;

            UPDATE predictions SET score = v_final_score WHERE id = v_pred.id;

            UPDATE users
            SET wins = wins + 1,
                score = GREATEST(0, score + v_final_score),
                current_streak = current_streak + 1,
                best_streak = GREATEST(best_streak, current_streak + 1)
            WHERE id = v_pred.user_id;
        ELSE
            UPDATE users
            SET losses = losses + 1,
                score = GREATEST(0, score + v_pred.score),
                current_streak = 0
            WHERE id = v_pred.user_id;
        END IF;

        INSERT INTO user_weight_class_stats (user_id, weight_class, wins, losses, score)
        VALUES (
            v_pred.user_id,
            v_weight_class,
            CASE WHEN v_pred.is_winner_correct THEN 1 ELSE 0 END,
            CASE WHEN NOT v_pred.is_winner_correct THEN 1 ELSE 0 END,
            COALESCE(v_pred.score, 0)
        )
        ON CONFLICT (user_id, weight_class) DO UPDATE SET
            wins = user_weight_class_stats.wins + EXCLUDED.wins,
            losses = user_weight_class_stats.losses + EXCLUDED.losses,
            score = user_weight_class_stats.score + EXCLUDED.score;
    END LOOP;

    SELECT COUNT(*)
    INTO v_total_predictors
    FROM predictions
    WHERE fight_id = p_fight_id;

    IF v_total_predictors >= 50 THEN
        SELECT COUNT(*)
        INTO v_correct_predictors
        FROM predictions
        WHERE fight_id = p_fight_id
          AND is_winner_correct = true;

        v_correct_pct := v_correct_predictors::FLOAT / v_total_predictors;

        FOR v_pred IN
            SELECT *
            FROM predictions
            WHERE fight_id = p_fight_id
              AND is_winner_correct = true
        LOOP
            IF v_pred.is_method_correct AND v_pred.is_round_correct AND v_correct_pct < 0.10 THEN
                INSERT INTO hall_of_fame_entries (user_id, fight_id, tier, bonus_points)
                VALUES (v_pred.user_id, p_fight_id, 'oracle', 50)
                ON CONFLICT (user_id, fight_id) DO NOTHING;

                UPDATE users
                SET score = score + 50,
                    hall_of_fame_count = hall_of_fame_count + 1
                WHERE id = v_pred.user_id;

                UPDATE predictions
                SET score = score + 50
                WHERE id = v_pred.id;
            ELSIF v_pred.is_method_correct AND v_correct_pct < 0.15 THEN
                INSERT INTO hall_of_fame_entries (user_id, fight_id, tier, bonus_points)
                VALUES (v_pred.user_id, p_fight_id, 'sniper', 20)
                ON CONFLICT (user_id, fight_id) DO NOTHING;

                UPDATE users
                SET score = score + 20,
                    hall_of_fame_count = hall_of_fame_count + 1
                WHERE id = v_pred.user_id;

                UPDATE predictions
                SET score = score + 20
                WHERE id = v_pred.id;
            ELSIF v_correct_pct < 0.20 THEN
                INSERT INTO hall_of_fame_entries (user_id, fight_id, tier, bonus_points)
                VALUES (v_pred.user_id, p_fight_id, 'sharp_call', 10)
                ON CONFLICT (user_id, fight_id) DO NOTHING;

                UPDATE users
                SET score = score + 10,
                    hall_of_fame_count = hall_of_fame_count + 1
                WHERE id = v_pred.user_id;

                UPDATE predictions
                SET score = score + 10
                WHERE id = v_pred.id;
            END IF;
        END LOOP;
    END IF;

    SELECT COUNT(*)
    INTO v_event_fights
    FROM fights
    WHERE event_id = v_event_id
      AND status = 'completed';

    IF v_event_fights = (SELECT COUNT(*) FROM fights WHERE event_id = v_event_id) AND v_event_fights > 0 THEN
        FOR v_pred IN
            SELECT DISTINCT p.user_id
            FROM predictions p
            JOIN fights f ON f.id = p.fight_id
            WHERE f.event_id = v_event_id
              AND p.is_winner_correct = true
            GROUP BY p.user_id
            HAVING COUNT(*) = v_event_fights
        LOOP
            INSERT INTO perfect_card_entries (user_id, event_id, bonus_points)
            VALUES (v_pred.user_id, v_event_id, 30)
            ON CONFLICT (user_id, event_id) DO NOTHING;

            UPDATE users
            SET score = score + 30
            WHERE id = v_pred.user_id;
        END LOOP;
    END IF;

    UPDATE users
    SET p4p_score = calculate_p4p_score(id)
    WHERE id IN (SELECT user_id FROM predictions WHERE fight_id = p_fight_id);

    UPDATE fights
    SET result_processed_at = now()
    WHERE id = p_fight_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION recalculate_all_scores() RETURNS void AS $$
DECLARE
    v_fight RECORD;
BEGIN
    UPDATE users
    SET score = 0,
        wins = 0,
        losses = 0,
        current_streak = 0,
        best_streak = 0,
        hall_of_fame_count = 0,
        p4p_score = 0;

    UPDATE predictions
    SET score = NULL,
        is_winner_correct = NULL,
        is_method_correct = NULL,
        is_round_correct = NULL;

    UPDATE fights
    SET result_processed_at = NULL
    WHERE status = 'completed';

    TRUNCATE user_weight_class_stats;
    TRUNCATE hall_of_fame_entries;
    TRUNCATE perfect_card_entries;

    FOR v_fight IN
        SELECT id
        FROM fights
        WHERE status = 'completed'
        ORDER BY start_time ASC
    LOOP
        PERFORM process_fight_result(v_fight.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 202604090002_profile_integrity.sql
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

COMMIT;
