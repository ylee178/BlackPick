-- Case-insensitive uniqueness for users.ring_name.
--
-- The existing UNIQUE constraint (`ring_name TEXT UNIQUE NOT NULL` from
-- 001_schema.sql) is case-sensitive, so "Sean" and "sean" are both
-- accepted today. The public share page (`/p/{ring_name}/{eventShortId}`)
-- looks ring names up via a case-insensitive `ilike`, which now 404s
-- ambiguously when two users differ only in case. The route handler also
-- pre-checks via `ilike` before INSERT/UPDATE, but two concurrent calls
-- can race past that check.
--
-- This migration adds a functional UNIQUE index on `lower(ring_name)` so
-- the database itself rejects case-collisions and the route handler's
-- existing 23505 → ring_name_taken mapping kicks in for both the race
-- and the gap-window cases.
--
-- Migration is split into two steps:
--   1. A pre-flight check that aborts loudly if any existing rows would
--      violate the new index. We don't silently de-dup — picking a
--      winner between two human ring names is a product decision.
--   2. CREATE UNIQUE INDEX IF NOT EXISTS, so re-running the migration on
--      a healthy DB is a no-op.

DO $$
DECLARE
  duplicate_count INT;
  duplicate_sample TEXT;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT lower(ring_name) AS lc
    FROM public.users
    WHERE ring_name IS NOT NULL
    GROUP BY lower(ring_name)
    HAVING COUNT(*) > 1
  ) dups;

  IF duplicate_count > 0 THEN
    SELECT string_agg(lc, ', ') INTO duplicate_sample
    FROM (
      SELECT lower(ring_name) AS lc
      FROM public.users
      WHERE ring_name IS NOT NULL
      GROUP BY lower(ring_name)
      HAVING COUNT(*) > 1
      LIMIT 10
    ) sample;

    RAISE EXCEPTION
      'Cannot create unique index on lower(ring_name): % case-insensitive duplicate(s) exist. First few: %. Resolve manually before re-running this migration.',
      duplicate_count,
      duplicate_sample;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_ring_name_lower_unique
  ON public.users (lower(ring_name));

COMMENT ON INDEX public.users_ring_name_lower_unique IS
  'Case-insensitive uniqueness guard for ring_name. Paired with the case-sensitive UNIQUE on the column itself; together they prevent both exact and case-collision duplicates so the public share page (/p/{ring_name}/...) can rely on ilike lookups returning at most one match.';
