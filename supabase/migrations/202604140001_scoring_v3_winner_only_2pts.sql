-- 202604140001 — Scoring v3: winner-only = 2pts (down from 4pts)
--
-- Sean 2026-04-14: "승자만 골라도 세이브할수잇게하자 ... 승자 맞추면
-- 2점으로해 너무 높으면 승자만 맞추는 꼼수 피울수도잇으니".
--
-- Rule change:
--   - Before: winner correct, no/wrong method + round → 4 pts
--   - After:  winner correct, no/wrong method + round → 2 pts
--
-- Winner+Method (8) and Winner+Method+Round (16 / 20 R4) branches
-- stay unchanged. This widens the reward gap between the cheap
-- "winner-only" strategy and the full-commitment pick, disincent-
-- ivising the low-risk path while still allowing it as an option
-- (paired with the new client-side canSave relaxation).
--
-- Idempotent: CREATE OR REPLACE FUNCTION. Safe to re-run.
-- No data migration needed — this only affects FUTURE predictions
-- scored by `process_fight_result` (which calls this function on
-- admin result submission). Historical picks retain their v2
-- scores.

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
        -- Winner only = +2 (was +4 in v2, reduced to disincentivise
        -- the low-risk strategy — Sean 2026-04-14 rule change)
        ELSE
            RETURN 2;
        END IF;
    ELSE
        -- Winner wrong = flat -2 regardless of detail
        RETURN -2;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Post-convergence assertion: verify the new return value by
-- invoking the function with a winner-correct, no-method-correct,
-- no-round-correct input. Expected: 2. Fails the migration if
-- the function still returns 4.
DO $$
DECLARE
    v_test_score INT;
BEGIN
    v_test_score := calculate_prediction_score(
        p_is_winner_correct := true,
        p_predicted_method := NULL,
        p_is_method_correct := NULL,
        p_predicted_round := NULL,
        p_is_round_correct := NULL
    );
    IF v_test_score <> 2 THEN
        RAISE EXCEPTION 'Scoring v3 migration failed: winner-only returned %, expected 2', v_test_score;
    END IF;
END $$;
