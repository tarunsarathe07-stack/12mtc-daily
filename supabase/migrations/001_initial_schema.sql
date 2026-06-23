-- ============================================================
-- CLAT Daily Arena — Full Database Schema
-- ============================================================

-- 1. Users (extends auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  rating int not null default 1000,
  xp int not null default 0,
  streak_current int not null default 0,
  streak_best int not null default 0,
  streak_last_date date,
  league text not null default 'bronze'
    check (league in ('bronze','silver','gold','platinum','diamond')),
  battles_played int not null default 0,
  battles_won int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. User roles (admin privileges — separate table for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('admin','editor')),
  granted_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

-- 3. Auth trigger — auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Player')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Content items (event-first: one row per current-affairs topic)
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text not null,
  body text,
  why_it_matters text,
  topic_tags text[] not null default '{}',
  source_urls text[] not null default '{}',
  citations jsonb default '[]',
  image_url text,
  difficulty text default 'medium'
    check (difficulty in ('easy','medium','hard')),
  status text not null default 'draft'
    check (status in ('draft','review','approved','published','rejected')),
  reviewed_by uuid references public.users(id),
  review_notes text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Questions
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references public.content_items(id),
  prompt text not null,
  options jsonb not null,
  correct_option text not null,
  explanation text not null,
  topic text not null,
  difficulty text not null default 'medium',
  source_citation text,
  status text not null default 'draft'
    check (status in ('draft','approved','rejected')),
  created_at timestamptz not null default now()
);

-- 6. Battle rooms
create table public.battle_rooms (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('daily','topic')),
  topic text,
  player1_id uuid not null references public.users(id),
  player2_id uuid references public.users(id),
  is_bot_match boolean not null default false,
  bot_profile jsonb,
  status text not null default 'waiting'
    check (status in ('waiting','countdown','in_progress','completed','abandoned')),
  questions_per_round int not null default 10,
  time_per_question_sec int not null default 15,
  current_question_index int not null default 0,
  question_started_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- 7. Battle room questions (join table)
create table public.battle_room_questions (
  id uuid primary key default gen_random_uuid(),
  battle_room_id uuid not null references public.battle_rooms(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  position int not null,
  unique(battle_room_id, position),
  unique(battle_room_id, question_id)
);

-- 8. Bot answer schedule (pre-computed, replaces server-side setTimeout)
create table public.bot_answer_schedule (
  id uuid primary key default gen_random_uuid(),
  battle_room_id uuid not null references public.battle_rooms(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  position int not null,
  selected_option text,
  is_correct boolean not null,
  answer_delay_ms int not null,
  created_at timestamptz not null default now()
);

-- 9. Battle answers (unified: human + bot)
create table public.battle_answers (
  id uuid primary key default gen_random_uuid(),
  battle_room_id uuid not null references public.battle_rooms(id),
  question_id uuid not null references public.questions(id),
  user_id uuid references public.users(id),
  is_bot boolean not null default false,
  selected_option text,
  is_correct boolean not null default false,
  time_taken_ms int,
  points numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Partial unique indexes (NULL-safe)
create unique index uniq_human_answer
  on battle_answers(battle_room_id, question_id, user_id)
  where is_bot = false;

create unique index uniq_bot_answer
  on battle_answers(battle_room_id, question_id)
  where is_bot = true;

-- 10. Battle results (one per participant, including bot)
create table public.battle_results (
  id uuid primary key default gen_random_uuid(),
  battle_room_id uuid not null references public.battle_rooms(id),
  user_id uuid references public.users(id),
  is_bot boolean not null default false,
  bot_profile_name text,
  total_score numeric not null default 0,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  skipped_count int not null default 0,
  avg_time_ms int,
  rating_change int not null default 0,
  xp_earned int not null default 0,
  is_winner boolean not null default false,
  created_at timestamptz not null default now()
);

-- 11. User topic mastery
create table public.user_topic_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  topic text not null,
  total_questions int not null default 0,
  correct_count int not null default 0,
  mastery_pct numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, topic)
);

-- 12. User content progress (reading tracking)
create table public.user_content_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  read_short boolean not null default false,
  read_blog boolean not null default false,
  read_duration_sec int,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, content_item_id)
);

-- 13. Bookmarks
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, content_item_id)
);

-- 14. Daily user activity (for streaks & XP)
create table public.daily_user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  activity_date date not null default current_date,
  shorts_read int not null default 0,
  blogs_read int not null default 0,
  battles_completed int not null default 0,
  battles_won int not null default 0,
  xp_earned int not null default 0,
  streak_qualified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, activity_date)
);

-- 15. Content pipeline runs
create table public.content_pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null default current_date,
  sources_queried jsonb,
  urls_discovered text[] default '{}',
  items_generated int default 0,
  items_approved int default 0,
  items_rejected int default 0,
  status text not null default 'running',
  error_log text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Content discovery
create index idx_content_status_published on content_items(status, published_at desc)
  where status = 'published';
create index idx_content_slug on content_items(slug);

-- Questions lookup
create index idx_questions_content on questions(content_item_id, status);

-- Battle matchmaking & history
create index idx_battle_rooms_matchmaking on battle_rooms(status, mode, topic, created_at)
  where status = 'waiting';
create index idx_battle_rooms_player1 on battle_rooms(player1_id, status);
create index idx_battle_rooms_player2 on battle_rooms(player2_id, status);
create index idx_brq_room on battle_room_questions(battle_room_id);
create index idx_bas_room on bot_answer_schedule(battle_room_id);

-- Battle answers lookup
create index idx_battle_answers_room_user on battle_answers(battle_room_id, user_id);

-- User progress & activity
create index idx_user_content_progress on user_content_progress(user_id, content_item_id);
create index idx_daily_activity on daily_user_activity(user_id, activity_date);
create index idx_bookmarks_user on bookmarks(user_id);

-- Topic mastery
create index idx_topic_mastery_user on user_topic_mastery(user_id, topic);

-- Leaderboard
create index idx_users_rating on users(rating desc);
create index idx_users_xp on users(xp desc);

-- ============================================================
-- RLS POLICIES
-- ============================================================
alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.content_items enable row level security;
alter table public.questions enable row level security;
alter table public.battle_rooms enable row level security;
alter table public.battle_room_questions enable row level security;
alter table public.bot_answer_schedule enable row level security;
alter table public.battle_answers enable row level security;
alter table public.battle_results enable row level security;
alter table public.user_topic_mastery enable row level security;
alter table public.user_content_progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.daily_user_activity enable row level security;
alter table public.content_pipeline_runs enable row level security;

-- Users: anyone can read (leaderboard), update own display_name/avatar only
create policy "Users are viewable by authenticated users"
  on public.users for select
  to authenticated
  using (true);

create policy "Users can update own profile fields"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- User roles: read own roles only, no insert/update/delete via RLS
create policy "Users can read own roles"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

-- Content items: published visible to all, admins see all
create policy "Published content visible to all"
  on public.content_items for select
  to authenticated
  using (
    status = 'published'
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('admin', 'editor')
    )
  );

-- Questions: visible to admins and players in related battles
create policy "Questions visible in context"
  on public.questions for select
  to authenticated
  using (
    status = 'approved'
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('admin', 'editor')
    )
  );

-- Battle rooms: players can see their own battles
create policy "Players can view own battles"
  on public.battle_rooms for select
  to authenticated
  using (player1_id = auth.uid() or player2_id = auth.uid());

create policy "Players can insert battle rooms"
  on public.battle_rooms for insert
  to authenticated
  with check (player1_id = auth.uid());

-- Battle room questions: readable by battle participants
create policy "Battle questions visible to participants"
  on public.battle_room_questions for select
  to authenticated
  using (
    exists (
      select 1 from public.battle_rooms
      where id = battle_room_id
      and (player1_id = auth.uid() or player2_id = auth.uid())
    )
  );

-- Bot answer schedule: readable by battle participants, not writable
create policy "Bot schedule visible to participants"
  on public.bot_answer_schedule for select
  to authenticated
  using (
    exists (
      select 1 from public.battle_rooms
      where id = battle_room_id
      and (player1_id = auth.uid() or player2_id = auth.uid())
    )
  );

-- Battle answers: visible to battle participants
create policy "Battle answers visible to participants"
  on public.battle_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.battle_rooms
      where id = battle_room_id
      and (player1_id = auth.uid() or player2_id = auth.uid())
    )
  );

create policy "Players can insert own answers"
  on public.battle_answers for insert
  to authenticated
  with check (user_id = auth.uid() and is_bot = false);

-- Battle results: visible to participants
create policy "Battle results visible to participants"
  on public.battle_results for select
  to authenticated
  using (
    exists (
      select 1 from public.battle_rooms
      where id = battle_room_id
      and (player1_id = auth.uid() or player2_id = auth.uid())
    )
  );

-- User topic mastery: own data only
create policy "Users can view own mastery"
  on public.user_topic_mastery for select
  to authenticated
  using (user_id = auth.uid());

-- User content progress: own data only
create policy "Users can manage own progress"
  on public.user_content_progress for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own progress"
  on public.user_content_progress for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own progress"
  on public.user_content_progress for update
  to authenticated
  using (user_id = auth.uid());

-- Bookmarks: own data only
create policy "Users can manage own bookmarks"
  on public.bookmarks for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own bookmarks"
  on public.bookmarks for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can delete own bookmarks"
  on public.bookmarks for delete
  to authenticated
  using (user_id = auth.uid());

-- Daily activity: own data only
create policy "Users can view own activity"
  on public.daily_user_activity for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own activity"
  on public.daily_user_activity for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own activity"
  on public.daily_user_activity for update
  to authenticated
  using (user_id = auth.uid());

-- Pipeline runs: admins only
create policy "Pipeline runs visible to admins"
  on public.content_pipeline_runs for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.battle_rooms;
alter publication supabase_realtime add table public.battle_answers;
