-- Admin-managed categorization flags on `fights`:
-- 1. `is_title_fight` — true when the fight is a championship title
--    bout. Separate from `is_cup_match` and from result status. The
--    crawler can't reliably infer title-fight status from source
--    markup, so the flag is set manually by an admin.
-- 2. `is_main_card` — true when the fight is featured on the event's
--    main card (the televised/headline section) as opposed to the
--    undercard/prelims. Specifically motivated by Black Cup events
--    that slot in main-card fights which are NOT part of the
--    national-bracket competition — `is_cup_match=false` alone can't
--    distinguish a slotted-in main-card fight from an undercard
--    prelim. Admin-managed for the same reason as `is_title_fight`:
--    the crawler can't classify fights into main card vs undercard
--    from source markup alone.
--
-- The two flags are independent of each other and of `is_cup_match`.
-- A single fight can be all three, none of them, or any combination:
-- e.g. a bracket match that's also a title fight on the main card,
-- or a non-bracket main-card fight that's neither a title fight nor
-- a cup match.
--
-- Schema-convergent shape for BOTH columns: `BOOLEAN NOT NULL
-- DEFAULT false`. The migration is wrapped in an explicit
-- transaction and written so it converges to the final shape even
-- when run against a partially-migrated database (e.g. one of the
-- columns exists from a prior failed run with a different shape).
-- A single `ADD COLUMN IF NOT EXISTS … NOT NULL DEFAULT false`
-- would silently no-op on a wrong-shape column, leaving the runtime
-- types out of sync with the database — round-1 gpt-review (max
-- profile) flag.
--
-- Per-column steps:
--   Step 1 adds the column with `DEFAULT false` pre-set so any
--     concurrent INSERT during the migration picks up `false`
--     instead of NULL — closes the "new row slips in with NULL
--     between backfill and SET NOT NULL" race flagged in round-2
--     gpt-review (max profile).
--   Step 2 coerces the default to `false` even if the column
--     already existed with a different (or missing) default from a
--     partial prior run. No-op when already correct.
--   Step 3 backfills any remaining NULL rows. On a clean database
--     step 1's DEFAULT makes existing rows `false` via PG's
--     virtual-default mechanism (O(1) catalog update in PG 11+),
--     so this UPDATE is a no-op.
--   Step 4 promotes the column to NOT NULL.
--
-- The explicit BEGIN/COMMIT gives Postgres-level atomicity for the
-- four ADD/SET/UPDATE/SET-NOT-NULL steps per column: either every
-- step lands and the columns converge, or the transaction aborts
-- and nothing persists. Each individual step is also idempotent, so
-- a re-run on a converged database is a no-op.
--
-- IMPORTANT: do NOT add statements after `COMMIT;`. Statements after
-- COMMIT execute outside this file's transaction boundary. Depending
-- on how this file is invoked (autocommit psql, REST query endpoint,
-- CLI wrappers — behavior varies by tool), post-COMMIT statements
-- either run in autocommit or in whatever transaction the caller
-- started. Either way they lose the convergence atomicity this file
-- is designed to provide. Add new steps BEFORE the COMMIT.

BEGIN;

-- is_title_fight ----------------------------------------------------

ALTER TABLE public.fights
  ADD COLUMN IF NOT EXISTS is_title_fight BOOLEAN DEFAULT false;

ALTER TABLE public.fights
  ALTER COLUMN is_title_fight SET DEFAULT false;

UPDATE public.fights
SET is_title_fight = false
WHERE is_title_fight IS NULL;

ALTER TABLE public.fights
  ALTER COLUMN is_title_fight SET NOT NULL;

COMMENT ON COLUMN public.fights.is_title_fight IS
  'True if this fight is a championship title bout. Manually flagged by admin (crawler cannot reliably infer title-fight status from source markup). Independent of is_cup_match and is_main_card.';

-- is_main_card ------------------------------------------------------

ALTER TABLE public.fights
  ADD COLUMN IF NOT EXISTS is_main_card BOOLEAN DEFAULT false;

ALTER TABLE public.fights
  ALTER COLUMN is_main_card SET DEFAULT false;

UPDATE public.fights
SET is_main_card = false
WHERE is_main_card IS NULL;

ALTER TABLE public.fights
  ALTER COLUMN is_main_card SET NOT NULL;

COMMENT ON COLUMN public.fights.is_main_card IS
  'True if this fight is featured on the event''s main card (televised/headline section) as opposed to the undercard. Lets Black Cup events distinguish slotted-in main-card fights (is_cup_match=false AND is_main_card=true) from undercard prelims (is_cup_match=false AND is_main_card=false). Manually flagged by admin — crawler cannot classify fights into main card vs undercard from source markup. Independent of is_cup_match and is_title_fight.';

-- Post-convergence assertion: both columns MUST exist, be NOT NULL,
-- carry the `false` default, and have zero NULL rows. Defense in
-- depth against wrong-Postgres-type starting states that the per-
-- column step sequence above is designed to absorb — if any step
-- silently no-oped on an unexpected pre-state, this block surfaces
-- it and aborts the transaction. Pattern matches the assertion in
-- 202604120001_ring_name_case_insensitive_unique.sql. Kept inside
-- the transaction (before COMMIT) so a failure rolls back atomically.
--
-- Note: the zero-NULL-rows check is redundant in the normal path
-- because Step 4 (SET NOT NULL) would have aborted the transaction
-- if any NULLs remained. It is kept as an extra guard for the case
-- where a future edit accidentally removes Step 4 from one of the
-- per-column blocks — the count-null check would then surface the
-- missing NOT NULL promotion instead of letting the migration silently
-- leave a nullable column.
DO $$
DECLARE
  col_rec RECORD;
  null_rows BIGINT;
  col_name TEXT;
BEGIN
  FOREACH col_name IN ARRAY ARRAY['is_title_fight', 'is_main_card'] LOOP
    SELECT is_nullable, column_default, data_type
      INTO col_rec
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'fights'
       AND column_name = col_name;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Post-migration assertion failed: public.fights.% does not exist', col_name;
    END IF;

    IF col_rec.data_type <> 'boolean' THEN
      RAISE EXCEPTION 'Post-migration assertion failed: public.fights.% has data_type=% (expected boolean)',
        col_name, col_rec.data_type;
    END IF;

    IF col_rec.is_nullable <> 'NO' THEN
      RAISE EXCEPTION 'Post-migration assertion failed: public.fights.% is_nullable=% (expected NO)',
        col_name, col_rec.is_nullable;
    END IF;

    -- information_schema returns the default expression as printed by
    -- pg_get_expr (e.g. `false` for a boolean literal). Match loosely
    -- via case-insensitive ILIKE '%false%' to absorb any future PG
    -- normalization such as `false::boolean`, a parenthesized form,
    -- or non-standard builds that capitalize the literal.
    IF col_rec.column_default IS NULL OR col_rec.column_default NOT ILIKE '%false%' THEN
      RAISE EXCEPTION 'Post-migration assertion failed: public.fights.% column_default=% (expected something containing ''false'')',
        col_name, COALESCE(col_rec.column_default, '<null>');
    END IF;

    EXECUTE format('SELECT COUNT(*) FROM public.fights WHERE %I IS NULL', col_name)
      INTO null_rows;

    IF null_rows > 0 THEN
      RAISE EXCEPTION 'Post-migration assertion failed: public.fights.% has % NULL rows after backfill',
        col_name, null_rows;
    END IF;
  END LOOP;
END $$;

COMMIT;
