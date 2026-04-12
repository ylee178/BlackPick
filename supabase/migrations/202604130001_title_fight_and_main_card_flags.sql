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
-- The explicit BEGIN/COMMIT makes atomicity independent of how the
-- migration is invoked (Supabase CLI, REST `database/query`
-- endpoint, psql, or pgAdmin). Each step is idempotent, so a
-- re-run on a converged database is a no-op.

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

COMMIT;
