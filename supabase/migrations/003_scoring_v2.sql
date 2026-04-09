-- ============================================
-- 003: Scoring System v2
-- - Even-number scoring (+4/+8/+16, -2)
-- - Streak multiplier (1.0/1.5/2.0/2.5x)
-- - Tiered Hall of Fame (Sharp Call / Sniper / Oracle)
-- - Perfect Card bonus
-- - P4P ranking (per-weight-class tracking)
-- - Score floor at 0
-- ============================================

-- ── New columns ──

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS p4p_score INT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_p4p ON users(p4p_score DESC);

-- ── Per-weight-class stats ──

CREATE TABLE IF NOT EXISTS public.user_weight_class_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight_class TEXT NOT NULL,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    UNIQUE(user_id, weight_class)
);

CREATE INDEX IF NOT EXISTS idx_uwcs_user ON user_weight_class_stats(user_id);

ALTER TABLE user_weight_class_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uwcs_select" ON user_weight_class_stats FOR SELECT USING (true);

-- ── Hall of Fame entries (permanent record) ──

CREATE TABLE IF NOT EXISTS public.hall_of_fame_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fight_id UUID NOT NULL REFERENCES fights(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('sharp_call', 'sniper', 'oracle')),
    bonus_points INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, fight_id)
);

ALTER TABLE hall_of_fame_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hof_select" ON hall_of_fame_entries FOR SELECT USING (true);

-- ── Perfect Card entries ──

CREATE TABLE IF NOT EXISTS public.perfect_card_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    bonus_points INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, event_id)
);

ALTER TABLE perfect_card_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_select" ON perfect_card_entries FOR SELECT USING (true);

-- ── Streak multiplier helper ──

CREATE OR REPLACE FUNCTION get_streak_multiplier(p_streak INT) RETURNS NUMERIC AS $$
BEGIN
    IF p_streak >= 7 THEN RETURN 2.5;
    ELSIF p_streak >= 5 THEN RETURN 2.0;
    ELSIF p_streak >= 3 THEN RETURN 1.5;
    ELSE RETURN 1.0;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── New scoring function (v2) ──

CREATE OR REPLACE FUNCTION calculate_prediction_score(
    p_is_winner_correct BOOLEAN,
    p_predicted_method TEXT,
    p_is_method_correct BOOLEAN,
    p_predicted_round INT,
    p_is_round_correct BOOLEAN
) RETURNS INT AS $$
BEGIN
    IF p_is_winner_correct THEN
        -- Winner + Method + Round = +16 (R4 = +20)
        IF p_is_method_correct AND p_is_round_correct THEN
            IF p_predicted_round = 4 THEN
                RETURN 20;
            END IF;
            RETURN 16;
        -- Winner + Method = +8
        ELSIF p_is_method_correct THEN
            RETURN 8;
        -- Winner only = +4
        ELSE
            RETURN 4;
        END IF;
    ELSE
        -- Winner wrong = flat -2 regardless of detail
        RETURN -2;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── P4P score calculator ──

CREATE OR REPLACE FUNCTION calculate_p4p_score(p_user_id UUID) RETURNS INT AS $$
DECLARE
    v_total_score NUMERIC := 0;
    v_qualified_classes INT := 0;
    v_breadth_bonus NUMERIC;
    v_rec RECORD;
BEGIN
    FOR v_rec IN
        SELECT weight_class, wins, losses,
               (wins + losses) AS total,
               CASE WHEN (wins + losses) > 0
                    THEN wins::NUMERIC / (wins + losses)
                    ELSE 0 END AS win_rate
        FROM user_weight_class_stats
        WHERE user_id = p_user_id
          AND (wins + losses) >= 3
          AND weight_class NOT IN ('캐치웨이트', '오픈웨이트', '기타', 'unknown')
    LOOP
        v_total_score := v_total_score + (v_rec.win_rate * sqrt(v_rec.total));
        v_qualified_classes := v_qualified_classes + 1;
    END LOOP;

    -- Minimum: 2 qualified classes
    IF v_qualified_classes < 2 THEN
        RETURN 0;
    END IF;

    -- Breadth bonus: 1 + 0.1*(classes-1), cap 2.0
    v_breadth_bonus := LEAST(2.0, 1.0 + 0.1 * (v_qualified_classes - 1));

    RETURN ROUND(v_total_score * v_breadth_bonus * 100)::INT;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── Updated process_fight_result (v2) ──

CREATE OR REPLACE FUNCTION process_fight_result(p_fight_id UUID) RETURNS void AS $$
DECLARE
    v_fight RECORD;
    v_pred RECORD;
    v_score INT;
    v_streak_mult NUMERIC;
    v_final_score INT;
    v_weight_class TEXT;
    v_total_predictors INT;
    v_correct_predictors INT;
    v_correct_pct FLOAT;
    v_event_id UUID;
    v_event_fights INT;
    v_user_correct_in_event INT;
BEGIN
    -- Get fight details
    SELECT * INTO v_fight FROM fights WHERE id = p_fight_id AND status = 'completed';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fight not found or not completed';
    END IF;

    v_event_id := v_fight.event_id;

    -- Determine weight class from fighters
    SELECT COALESCE(fa.weight_class, fb.weight_class, '기타')
    INTO v_weight_class
    FROM fighters fa, fighters fb
    WHERE fa.id = v_fight.fighter_a_id AND fb.id = v_fight.fighter_b_id;

    -- Step 1: Calculate correctness for each prediction
    FOR v_pred IN SELECT * FROM predictions WHERE fight_id = p_fight_id LOOP
        UPDATE predictions SET
            is_winner_correct = (winner_id = v_fight.winner_id),
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

    -- Step 2: Calculate base scores
    UPDATE predictions SET
        score = calculate_prediction_score(
            is_winner_correct, method, is_method_correct, round, is_round_correct
        )
    WHERE fight_id = p_fight_id;

    -- Step 3: Apply streak multiplier to wins, then update user stats
    FOR v_pred IN
        SELECT p.*, u.current_streak
        FROM predictions p
        JOIN users u ON u.id = p.user_id
        WHERE p.fight_id = p_fight_id
    LOOP
        IF v_pred.is_winner_correct THEN
            -- Apply streak multiplier to base score
            v_streak_mult := get_streak_multiplier(v_pred.current_streak);
            v_final_score := ROUND(v_pred.score * v_streak_mult)::INT;

            -- Update prediction with final score
            UPDATE predictions SET score = v_final_score WHERE id = v_pred.id;

            -- Update user: win, add score (floor 0), extend streak
            UPDATE users SET
                wins = wins + 1,
                score = GREATEST(0, score + v_final_score),
                current_streak = current_streak + 1,
                best_streak = GREATEST(best_streak, current_streak + 1)
            WHERE id = v_pred.user_id;
        ELSE
            -- Loss: flat -2, reset streak
            UPDATE users SET
                losses = losses + 1,
                score = GREATEST(0, score + v_pred.score),
                current_streak = 0
            WHERE id = v_pred.user_id;
        END IF;

        -- Update per-weight-class stats
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

    -- Step 4: Hall of Fame (min 50 voters)
    SELECT COUNT(*) INTO v_total_predictors
    FROM predictions WHERE fight_id = p_fight_id;

    IF v_total_predictors >= 50 THEN
        SELECT COUNT(*) INTO v_correct_predictors
        FROM predictions WHERE fight_id = p_fight_id AND is_winner_correct = true;

        v_correct_pct := v_correct_predictors::FLOAT / v_total_predictors;

        -- Check each correct predictor for HoF tiers
        FOR v_pred IN
            SELECT * FROM predictions
            WHERE fight_id = p_fight_id AND is_winner_correct = true
        LOOP
            -- 🥇 Oracle: winner+method+round correct, <10% picked same
            IF v_pred.is_method_correct AND v_pred.is_round_correct AND v_correct_pct < 0.10 THEN
                INSERT INTO hall_of_fame_entries (user_id, fight_id, tier, bonus_points)
                VALUES (v_pred.user_id, p_fight_id, 'oracle', 50)
                ON CONFLICT (user_id, fight_id) DO NOTHING;

                UPDATE users SET
                    score = score + 50,
                    hall_of_fame_count = hall_of_fame_count + 1
                WHERE id = v_pred.user_id;

                UPDATE predictions SET score = score + 50
                WHERE id = v_pred.id;

            -- 🥈 Sniper: winner+method correct, <15% picked same
            ELSIF v_pred.is_method_correct AND v_correct_pct < 0.15 THEN
                INSERT INTO hall_of_fame_entries (user_id, fight_id, tier, bonus_points)
                VALUES (v_pred.user_id, p_fight_id, 'sniper', 20)
                ON CONFLICT (user_id, fight_id) DO NOTHING;

                UPDATE users SET
                    score = score + 20,
                    hall_of_fame_count = hall_of_fame_count + 1
                WHERE id = v_pred.user_id;

                UPDATE predictions SET score = score + 20
                WHERE id = v_pred.id;

            -- 🥉 Sharp Call: winner correct, <20% picked same
            ELSIF v_correct_pct < 0.20 THEN
                INSERT INTO hall_of_fame_entries (user_id, fight_id, tier, bonus_points)
                VALUES (v_pred.user_id, p_fight_id, 'sharp_call', 10)
                ON CONFLICT (user_id, fight_id) DO NOTHING;

                UPDATE users SET
                    score = score + 10,
                    hall_of_fame_count = hall_of_fame_count + 1
                WHERE id = v_pred.user_id;

                UPDATE predictions SET score = score + 10
                WHERE id = v_pred.id;
            END IF;
        END LOOP;
    END IF;

    -- Step 5: Perfect Card check (all fights in event correct)
    SELECT COUNT(*) INTO v_event_fights
    FROM fights WHERE event_id = v_event_id AND status = 'completed';

    -- Only check if all event fights are completed
    IF v_event_fights = (SELECT COUNT(*) FROM fights WHERE event_id = v_event_id) AND v_event_fights > 0 THEN
        FOR v_pred IN
            SELECT DISTINCT p.user_id
            FROM predictions p
            JOIN fights f ON f.id = p.fight_id
            WHERE f.event_id = v_event_id AND p.is_winner_correct = true
            GROUP BY p.user_id
            HAVING COUNT(*) = v_event_fights
        LOOP
            INSERT INTO perfect_card_entries (user_id, event_id, bonus_points)
            VALUES (v_pred.user_id, v_event_id, 30)
            ON CONFLICT (user_id, event_id) DO NOTHING;

            UPDATE users SET score = score + 30
            WHERE id = v_pred.user_id;
        END LOOP;
    END IF;

    -- Step 6: Update P4P scores for affected users
    UPDATE users SET p4p_score = calculate_p4p_score(id)
    WHERE id IN (SELECT user_id FROM predictions WHERE fight_id = p_fight_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Recalculate all scores (one-time migration helper) ──

CREATE OR REPLACE FUNCTION recalculate_all_scores() RETURNS void AS $$
DECLARE
    v_fight RECORD;
BEGIN
    -- Reset everything
    UPDATE users SET score = 0, wins = 0, losses = 0, current_streak = 0, best_streak = 0, hall_of_fame_count = 0, p4p_score = 0;
    UPDATE predictions SET score = NULL, is_winner_correct = NULL, is_method_correct = NULL, is_round_correct = NULL;
    TRUNCATE user_weight_class_stats;
    TRUNCATE hall_of_fame_entries;
    TRUNCATE perfect_card_entries;

    -- Replay all completed fights in chronological order
    FOR v_fight IN
        SELECT id FROM fights WHERE status = 'completed' ORDER BY start_time ASC
    LOOP
        PERFORM process_fight_result(v_fight.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
