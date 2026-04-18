-- 202604180002 — Comment-reply depth guard (defense-in-depth)
--
-- BlackPick uses a 1-level flat reply model (YouTube/Twitter pattern, not
-- Reddit N-depth). The API-level guard in
-- `src/app/api/{comments,fighter-comments}/route.ts` rejects a POST whose
-- `parent_id` points to a row that itself has a non-null `parent_id`. This
-- migration adds the same rule to the existing trigger functions so that
-- raw-SQL paths (admin inserts, dev seed, future migrations) can't bypass
-- the API guard.
--
-- Strategy: extend the existing
-- `enforce_fight_comment_parent_match` and `enforce_fighter_comment_parent_match`
-- trigger functions (from 202604170001) with a depth check. The original
-- functions already select the parent row to verify same-target ownership;
-- we extend the same SELECT to also pull `parent_id`, and reject if it's
-- non-null.
--
-- Idempotent — CREATE OR REPLACE + existing trigger definitions are reused
-- unchanged.

--------------------------------------------------------------------------------
-- fight_comments: extend same-target trigger with depth-1 enforcement
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_fight_comment_parent_match()
RETURNS trigger AS $$
DECLARE
    v_parent_fight_id UUID;
    v_parent_parent_id UUID;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT fight_id, parent_id
    INTO v_parent_fight_id, v_parent_parent_id
    FROM public.fight_comments
    WHERE id = NEW.parent_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent comment % not found', NEW.parent_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_parent_fight_id <> NEW.fight_id THEN
        RAISE EXCEPTION 'Parent comment % belongs to fight %, not %',
            NEW.parent_id, v_parent_fight_id, NEW.fight_id
            USING ERRCODE = 'check_violation';
    END IF;

    IF v_parent_parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Reply nesting beyond one level is not allowed (parent % is itself a reply)',
            NEW.parent_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- Trigger definition from 202604170001 is unchanged; CREATE OR REPLACE on
-- the function above propagates the new body to the existing trigger.

--------------------------------------------------------------------------------
-- fighter_comments: mirror the same rule
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_fighter_comment_parent_match()
RETURNS trigger AS $$
DECLARE
    v_parent_fighter_id UUID;
    v_parent_parent_id UUID;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT fighter_id, parent_id
    INTO v_parent_fighter_id, v_parent_parent_id
    FROM public.fighter_comments
    WHERE id = NEW.parent_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent comment % not found', NEW.parent_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_parent_fighter_id <> NEW.fighter_id THEN
        RAISE EXCEPTION 'Parent comment % belongs to fighter %, not %',
            NEW.parent_id, v_parent_fighter_id, NEW.fighter_id
            USING ERRCODE = 'check_violation';
    END IF;

    IF v_parent_parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Reply nesting beyond one level is not allowed (parent % is itself a reply)',
            NEW.parent_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;
