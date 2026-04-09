-- Tag fights that are part of the cup tournament bracket
ALTER TABLE public.fights
ADD COLUMN IF NOT EXISTS is_cup_match BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.fights.is_cup_match IS 'True if this fight is part of the Black Cup tournament bracket (vs undercard)';
