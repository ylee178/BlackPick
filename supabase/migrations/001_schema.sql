-- ============================================
-- Black Pick — Database Schema v1
-- Supabase (PostgreSQL + Auth + RLS)
-- ============================================

-- Enable UUID extension (Supabase has this by default)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. TABLES
-- ============================================

-- Users (linked to Supabase Auth)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    ring_name TEXT UNIQUE NOT NULL,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    current_streak INT NOT NULL DEFAULT 0,
    best_streak INT NOT NULL DEFAULT 0,
    hall_of_fame_count INT NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fighters
CREATE TABLE public.fighters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    record TEXT, -- e.g. "5-2-0"
    nationality TEXT,
    weight_class TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    series_type TEXT NOT NULL CHECK (series_type IN ('black_cup', 'numbering', 'rise', 'other')),
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed')),
    mvp_video_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fights
CREATE TABLE public.fights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    fighter_a_id UUID NOT NULL REFERENCES fighters(id),
    fighter_b_id UUID NOT NULL REFERENCES fighters(id),
    start_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
    winner_id UUID REFERENCES fighters(id),
    method TEXT CHECK (method IN ('KO/TKO', 'Submission', 'Decision')),
    round INT CHECK (round BETWEEN 1 AND 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (fighter_a_id != fighter_b_id)
);

-- Predictions
CREATE TABLE public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fight_id UUID NOT NULL REFERENCES fights(id) ON DELETE CASCADE,
    winner_id UUID NOT NULL REFERENCES fighters(id),
    method TEXT CHECK (method IN ('KO/TKO', 'Submission', 'Decision')),
    round INT CHECK (round BETWEEN 1 AND 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_winner_correct BOOLEAN,
    is_method_correct BOOLEAN,
    is_round_correct BOOLEAN,
    score INT,
    UNIQUE (user_id, fight_id)
);

-- MVP Votes
CREATE TABLE public.mvp_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    fighter_id UUID NOT NULL REFERENCES fighters(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, event_id)
);

-- Rankings (Series / Event)
CREATE TABLE public.rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('series', 'event')),
    reference_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INT NOT NULL DEFAULT 0,
    rank INT NOT NULL,
    UNIQUE (type, reference_id, user_id)
);

-- ============================================
-- 2. INDEXES
-- ============================================

CREATE INDEX idx_users_score ON users(score DESC);
CREATE INDEX idx_users_ring_name ON users(ring_name);

CREATE INDEX idx_fighters_name ON fighters(name);

CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date DESC);

CREATE INDEX idx_fights_event_id ON fights(event_id);
CREATE INDEX idx_fights_start_time ON fights(start_time);
CREATE INDEX idx_fights_status ON fights(status);

CREATE INDEX idx_predictions_user_id ON predictions(user_id);
CREATE INDEX idx_predictions_fight_id ON predictions(fight_id);

CREATE INDEX idx_mvp_votes_event_id ON mvp_votes(event_id);

CREATE INDEX idx_rankings_type_ref ON rankings(type, reference_id);
CREATE INDEX idx_rankings_user_id ON rankings(user_id);

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fighters ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fights ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvp_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

-- Users: read all, update own
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());

-- Fighters: public read
CREATE POLICY "fighters_select" ON fighters FOR SELECT USING (true);

-- Events: public read
CREATE POLICY "events_select" ON events FOR SELECT USING (true);

-- Fights: public read
CREATE POLICY "fights_select" ON fights FOR SELECT USING (true);

-- Predictions: CRITICAL security policies
-- SELECT: before fight start = own only, after fight start = all public
CREATE POLICY "predictions_select" ON predictions FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM fights WHERE fights.id = predictions.fight_id AND fights.start_time <= now()
    )
);

-- INSERT: only before fight starts, only own predictions
CREATE POLICY "predictions_insert" ON predictions FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM fights
        WHERE fights.id = fight_id
        AND fights.start_time > now()
        AND fights.status = 'upcoming'
    )
);

-- UPDATE: only before fight starts, only own predictions
CREATE POLICY "predictions_update" ON predictions FOR UPDATE USING (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM fights
        WHERE fights.id = fight_id
        AND fights.start_time > now()
        AND fights.status = 'upcoming'
    )
);

-- No DELETE policy (predictions cannot be deleted)

-- MVP Votes: insert own, read all
CREATE POLICY "mvp_votes_select" ON mvp_votes FOR SELECT USING (true);
CREATE POLICY "mvp_votes_insert" ON mvp_votes FOR INSERT WITH CHECK (
    user_id = auth.uid()
);

-- Rankings: public read
CREATE POLICY "rankings_select" ON rankings FOR SELECT USING (true);

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Score calculation based on PRD scoring system
CREATE OR REPLACE FUNCTION calculate_prediction_score(
    p_is_winner_correct BOOLEAN,
    p_predicted_method TEXT,
    p_is_method_correct BOOLEAN,
    p_predicted_round INT,
    p_is_round_correct BOOLEAN
) RETURNS INT AS $$
BEGIN
    IF p_is_winner_correct THEN
        -- Winner correct + Method correct + Round correct = 10
        IF p_is_method_correct AND p_is_round_correct THEN
            RETURN 10;
        -- Winner correct + Method correct, Round wrong or not selected = 7
        ELSIF p_is_method_correct THEN
            RETURN 7;
        -- Winner correct only = 3
        ELSE
            RETURN 3;
        END IF;
    ELSE
        -- Winner wrong: penalty based on how much detail was selected
        IF p_predicted_round IS NOT NULL THEN
            RETURN -5;  -- Selected round = most risk
        ELSIF p_predicted_method IS NOT NULL THEN
            RETURN -3;  -- Selected method
        ELSE
            RETURN 0;   -- Winner only = no penalty
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Process fight result: called after admin inputs fight result
CREATE OR REPLACE FUNCTION process_fight_result(p_fight_id UUID) RETURNS void AS $$
DECLARE
    v_fight RECORD;
    v_pred RECORD;
    v_score INT;
    v_total_predictors INT;
    v_correct_predictors INT;
    v_hof_threshold FLOAT;
BEGIN
    -- Get fight details
    SELECT * INTO v_fight FROM fights WHERE id = p_fight_id AND status = 'completed';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fight not found or not completed';
    END IF;

    -- Process each prediction
    FOR v_pred IN SELECT * FROM predictions WHERE fight_id = p_fight_id LOOP
        -- Calculate correctness
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

    -- Calculate and set scores
    UPDATE predictions SET
        score = calculate_prediction_score(
            is_winner_correct,
            method,
            is_method_correct,
            round,
            is_round_correct
        )
    WHERE fight_id = p_fight_id;

    -- Update user stats
    UPDATE users u SET
        wins = u.wins + CASE WHEN p.is_winner_correct THEN 1 ELSE 0 END,
        losses = u.losses + CASE WHEN NOT p.is_winner_correct THEN 1 ELSE 0 END,
        score = u.score + COALESCE(p.score, 0),
        current_streak = CASE
            WHEN p.is_winner_correct THEN u.current_streak + 1
            ELSE 0
        END,
        best_streak = CASE
            WHEN p.is_winner_correct AND (u.current_streak + 1) > u.best_streak
            THEN u.current_streak + 1
            ELSE u.best_streak
        END
    FROM predictions p
    WHERE u.id = p.user_id AND p.fight_id = p_fight_id;

    -- Hall of Fame check
    SELECT COUNT(*) INTO v_total_predictors FROM predictions WHERE fight_id = p_fight_id;
    SELECT COUNT(*) INTO v_correct_predictors FROM predictions WHERE fight_id = p_fight_id AND is_winner_correct = true;

    IF v_total_predictors >= 20 THEN
        v_hof_threshold := v_correct_predictors::FLOAT / v_total_predictors;
        IF v_hof_threshold <= 0.05 THEN
            -- Award Hall of Fame bonus
            UPDATE users SET
                score = score + 50,
                hall_of_fame_count = hall_of_fame_count + 1
            WHERE id IN (
                SELECT user_id FROM predictions
                WHERE fight_id = p_fight_id AND is_winner_correct = true
            );
            -- Also update prediction scores
            UPDATE predictions SET score = score + 50
            WHERE fight_id = p_fight_id AND is_winner_correct = true;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at on predictions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_predictions_updated_at
    BEFORE UPDATE ON predictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
