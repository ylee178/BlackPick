-- Add preferred_language column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT NULL;

COMMENT ON COLUMN public.users.preferred_language IS 'User preferred locale (en, ko, ja, es, zh-CN, mn)';
