-- Fighter comments table
create table if not exists fighter_comments (
  id uuid primary key default gen_random_uuid(),
  fighter_id uuid not null references fighters(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  parent_id uuid references fighter_comments(id) on delete cascade,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_fighter_comments_fighter_id on fighter_comments(fighter_id);
create index if not exists idx_fighter_comments_parent_id on fighter_comments(parent_id);

-- Fighter comment likes table
create table if not exists fighter_comment_likes (
  comment_id uuid not null references fighter_comments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- RLS policies
alter table fighter_comments enable row level security;
alter table fighter_comment_likes enable row level security;

-- Anyone can read comments
create policy "fighter_comments_select" on fighter_comments for select using (true);
-- Authenticated users can insert
create policy "fighter_comments_insert" on fighter_comments for insert with check (auth.uid() = user_id);
-- Users can delete their own
create policy "fighter_comments_delete" on fighter_comments for delete using (auth.uid() = user_id);

-- Anyone can read likes
create policy "fighter_comment_likes_select" on fighter_comment_likes for select using (true);
-- Authenticated users can insert/delete their own likes
create policy "fighter_comment_likes_insert" on fighter_comment_likes for insert with check (auth.uid() = user_id);
create policy "fighter_comment_likes_delete" on fighter_comment_likes for delete using (auth.uid() = user_id);
