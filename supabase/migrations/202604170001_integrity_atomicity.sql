ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.events.completed_at IS
    'When the event was marked completed. Used to anchor MVP voting and other post-event windows.';

UPDATE public.events e
SET completed_at = COALESCE(
    (
        SELECT MAX(f.start_time)
        FROM public.fights f
        WHERE f.event_id = e.id
    ),
    ((e.date::timestamp + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul') - INTERVAL '1 millisecond'
)
WHERE e.status = 'completed'
  AND e.completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.sync_event_completed_at()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'completed' THEN
            IF NEW.completed_at IS NULL THEN
                NEW.completed_at := now();
            END IF;
        ELSE
            NEW.completed_at := NULL;
        END IF;

        RETURN NEW;
    END IF;

    IF NEW.status = 'completed' THEN
        IF OLD.status IS DISTINCT FROM 'completed' AND NEW.completed_at IS NULL THEN
            NEW.completed_at := now();
        ELSIF OLD.status = 'completed' AND NEW.completed_at IS NULL THEN
            NEW.completed_at := OLD.completed_at;
        END IF;
    ELSIF OLD.status = 'completed' THEN
        NEW.completed_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_completed_at ON public.events;

CREATE TRIGGER trg_events_completed_at
    BEFORE INSERT OR UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_event_completed_at();

CREATE OR REPLACE FUNCTION public.reset_user_record(p_user_id UUID)
RETURNS void AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.reset_user_record(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_user_record(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_process_fight_result(
    p_fight_id UUID,
    p_winner_id UUID,
    p_method TEXT,
    p_round INT
) RETURNS void AS $$
DECLARE
    v_fight RECORD;
BEGIN
    SELECT id, fighter_a_id, fighter_b_id, result_processed_at
    INTO v_fight
    FROM public.fights
    WHERE id = p_fight_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fight not found';
    END IF;

    IF v_fight.result_processed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Fight result has already been processed';
    END IF;

    IF p_method NOT IN ('KO/TKO', 'Submission', 'Decision') THEN
        RAISE EXCEPTION 'method must be KO/TKO, Submission, or Decision';
    END IF;

    IF p_round IS NULL OR p_round < 1 OR p_round > 5 THEN
        RAISE EXCEPTION 'round must be between 1 and 5';
    END IF;

    IF p_winner_id NOT IN (v_fight.fighter_a_id, v_fight.fighter_b_id) THEN
        RAISE EXCEPTION 'winner_id does not belong to the selected fight';
    END IF;

    UPDATE public.fights
    SET winner_id = p_winner_id,
        method = p_method,
        round = p_round,
        status = 'completed'
    WHERE id = p_fight_id;

    PERFORM public.process_fight_result(p_fight_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.admin_process_fight_result(UUID, UUID, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_process_fight_result(UUID, UUID, TEXT, INT) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_fight_comment_parent_match()
RETURNS trigger AS $$
DECLARE
    v_parent_fight_id UUID;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT fight_id
    INTO v_parent_fight_id
    FROM public.fight_comments
    WHERE id = NEW.parent_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent fight comment not found';
    END IF;

    IF v_parent_fight_id <> NEW.fight_id THEN
        RAISE EXCEPTION 'Parent fight comment must belong to the same fight';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fight_comments_parent_match ON public.fight_comments;

CREATE TRIGGER trg_fight_comments_parent_match
    BEFORE INSERT OR UPDATE OF parent_id, fight_id ON public.fight_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_fight_comment_parent_match();

CREATE OR REPLACE FUNCTION public.enforce_fighter_comment_parent_match()
RETURNS trigger AS $$
DECLARE
    v_parent_fighter_id UUID;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT fighter_id
    INTO v_parent_fighter_id
    FROM public.fighter_comments
    WHERE id = NEW.parent_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent fighter comment not found';
    END IF;

    IF v_parent_fighter_id <> NEW.fighter_id THEN
        RAISE EXCEPTION 'Parent fighter comment must belong to the same fighter';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fighter_comments_parent_match ON public.fighter_comments;

CREATE TRIGGER trg_fighter_comments_parent_match
    BEFORE INSERT OR UPDATE OF parent_id, fighter_id ON public.fighter_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_fighter_comment_parent_match();
