alter table public.fighters
  add column if not exists ring_name text,
  add column if not exists name_en text,
  add column if not exists name_ko text;
