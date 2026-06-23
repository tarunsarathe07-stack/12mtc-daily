-- ============================================================
-- 005: Student accounts + server-authoritative quiz sessions
--      + conversion events
-- ============================================================

-- ── Student profile fields ──────────────────────────────────

alter table public.users
  add column if not exists phone text,
  add column if not exists target_exam_year int
    check (target_exam_year is null or (target_exam_year >= 2024 and target_exam_year <= 2035)),
  add column if not exists city text,
  add column if not exists last_active_at timestamptz;

-- Extend the signup trigger to capture profile fields from metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name, target_exam_year, phone, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Player'),
    nullif(new.raw_user_meta_data->>'target_exam_year', '')::int,
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'city', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Students may update their own profile fields (001 already allows
-- update-own-row; phone/target_exam_year/city ride on that policy).

-- ── Quiz sessions (server-authoritative bot battles) ────────
-- The server creates the session, snapshots the questions WITH correct
-- answers, and pre-computes the bot's answers. The client never sees
-- correct options before answering and never submits score totals.

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  mode text not null default 'daily' check (mode in ('daily','topic')),
  topic text,
  bot_profile jsonb not null,
  -- Server-side snapshot: [{id, prompt, options, correct_option, explanation, topic, difficulty}]
  questions jsonb not null,
  -- Server-side bot plan: [{selectedOption, isCorrect, delayMs}]
  bot_answers jsonb not null,
  status text not null default 'active'
    check (status in ('active','completed','abandoned')),
  player_score numeric,
  bot_score numeric,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_quiz_sessions_user
  on public.quiz_sessions(user_id, created_at desc);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  question_id uuid,
  question_index int not null,
  selected_option text,
  is_correct boolean not null default false,
  points numeric not null default 0,
  time_ms int,
  bot_option text,
  bot_correct boolean not null default false,
  bot_points numeric not null default 0,
  bot_time_ms int,
  topic text,
  created_at timestamptz not null default now(),
  unique(session_id, question_index)
);

create index if not exists idx_quiz_answers_session
  on public.quiz_answers(session_id, question_index);

-- ── Conversion events (funnel analytics) ────────────────────

create table if not exists public.conversion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  event_type text not null,
    -- read_12_complete | battle_complete | weak_topic_shown | blog_cta_click | profile_cta_click
  cta_label text,
  meta jsonb default '{}',
  path text,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversion_events_user
  on public.conversion_events(user_id, created_at desc);
create index if not exists idx_conversion_events_type
  on public.conversion_events(event_type, created_at desc);

-- ── RLS ─────────────────────────────────────────────────────

alter table public.quiz_sessions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.conversion_events enable row level security;

-- Sessions/answers: students read their own; ALL writes go through
-- server API routes with the service-role key (no insert/update policies).
create policy "Students read own quiz sessions"
  on public.quiz_sessions for select
  to authenticated
  using (user_id = auth.uid());

create policy "Students read own quiz answers"
  on public.quiz_answers for select
  to authenticated
  using (user_id = auth.uid());

-- Conversion events: students may insert their own; reads are admin-only
create policy "Students insert own events"
  on public.conversion_events for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Admins read events"
  on public.conversion_events for select
  to authenticated
  using (public.is_admin_or_editor());

-- Topic mastery: server-computed; students already read own (001).
-- users.last_active_at is updated by server routes (service role).
