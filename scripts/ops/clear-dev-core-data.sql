DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'fighter_comment_translations',
    'fighter_comment_likes',
    'fighter_comments',
    'comment_translations',
    'comment_likes',
    'fight_comments',
    'hall_of_fame_entries',
    'perfect_card_entries',
    'user_weight_class_stats',
    'rankings',
    'mvp_votes',
    'predictions',
    'notifications',
    'fights',
    'events',
    'fighters'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', table_name);
    END IF;
  END LOOP;
END
$$;
