-- 202604190001 — fighters rank + source_fighter_id
--
-- Adds columns needed to persist BC's division rankings:
--
--   - `source_fighter_id` TEXT — BC fighter seq from blackcombat-official.com
--     `/fighter/{seq}`, used as a stable identity key for mapping BC ranking
--     rows to our fighter rows. Non-unique at rollout because name-based
--     backfill via `sync-bc-event-card.ts` is heuristic; promote to UNIQUE
--     after a duplicate audit (see `Docs/codex-review.md` §When to escalate —
--     a `blackpick_max` review should gate that follow-up).
--
--   - `is_champion` BOOLEAN + `rank_position` SMALLINT — two-column rank
--     model matching the codebase's existing pattern of explicit booleans
--     for distinct roles (`is_title_fight`, `is_main_card`, `is_cup_match`).
--     `0 = champion` as a single SMALLINT sentinel would be the odd one out
--     in this schema (2026-04-19 Codex review verbatim:
--     "`champion` is the same kind of thing; `0 = champion` would be hidden
--     domain knowledge that leaks into fight-card and leaderboard code").
--
-- Invariant: `is_champion = true` ⇒ `rank_position IS NULL`. Enforced with
-- a row-local CHECK rather than a trigger because the rule is row-local;
-- triggers are for cross-row coercion (Codex 2026-04-19).
--
-- Read-path contract: live BC rank from `fetchBcEventDataFull` stays the
-- primary source on event/fight cards (already in production). These DB
-- columns are the fallback + the sole source on `/fighters/{id}` detail
-- page (no event context there). Promoting DB to primary on event cards
-- must wait until rank sync is automated (`feature/crawler-automation-
-- cadence`, next branch in queue) — doing it now would regress freshness
-- vs. the live per-render fetch.
--
-- Stale-reset contract: `sync-bc-fighter-ranks.ts` nulls both columns for
-- fighters no longer in their division's top-15 (or no longer champion).
-- Retired vs. demoted is not distinguishable from BC's ranking page; both
-- states collapse to NULL/false which is the correct "unranked" display.

BEGIN;

ALTER TABLE public.fighters
    ADD COLUMN IF NOT EXISTS source_fighter_id TEXT;

ALTER TABLE public.fighters
    ADD COLUMN IF NOT EXISTS is_champion BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.fighters
    ADD COLUMN IF NOT EXISTS rank_position SMALLINT;

-- Range guard on rank_position. NULL allowed (unranked / champion).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fighters_rank_position_range_check'
    ) THEN
        ALTER TABLE public.fighters
            ADD CONSTRAINT fighters_rank_position_range_check
            CHECK (rank_position IS NULL OR rank_position BETWEEN 1 AND 15);
    END IF;
END;
$$;

-- Row invariant: champion rows must have NULL rank_position. Ranked
-- positions 1..15 are non-champions.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fighters_champion_rank_exclusive_check'
    ) THEN
        ALTER TABLE public.fighters
            ADD CONSTRAINT fighters_champion_rank_exclusive_check
            CHECK (NOT is_champion OR rank_position IS NULL);
    END IF;
END;
$$;

-- Index for `sync-bc-fighter-ranks.ts` lookup by BC seq. Non-unique
-- during initial backfill; the sync script skips any fighter row where
-- more than one candidate matches.
CREATE INDEX IF NOT EXISTS fighters_source_fighter_id_idx
    ON public.fighters (source_fighter_id)
    WHERE source_fighter_id IS NOT NULL;

COMMENT ON COLUMN public.fighters.source_fighter_id IS
    'BC fighter seq from blackcombat-official.com /fighter/{seq}. Non-unique during initial backfill — promote to UNIQUE after duplicate audit.';

COMMENT ON COLUMN public.fighters.is_champion IS
    'True iff the fighter currently holds the division title per BC /ranking.php. Mutually exclusive with non-null rank_position (enforced by fighters_champion_rank_exclusive_check). Synced via src/scripts/sync-bc-fighter-ranks.ts.';

COMMENT ON COLUMN public.fighters.rank_position IS
    '1..15 for ranked non-champion contenders per BC /ranking.php, NULL for champions or unranked. Synced via src/scripts/sync-bc-fighter-ranks.ts; fighters falling out of top-15 are reset to NULL.';

COMMIT;
