-- ============================================================
-- 011: Public-launch security hardening
-- ============================================================

-- Keep private profile data and server-owned game state behind API routes.
drop policy if exists "Users are viewable by authenticated users" on public.users;
drop policy if exists "Users can update own profile fields" on public.users;

create policy "Users can view own profile"
  on public.users for select
  to authenticated
  using (id = auth.uid());

revoke all privileges on table public.users from anon, authenticated;
revoke all privileges on table public.user_roles from anon, authenticated;
revoke all privileges on table public.questions from anon, authenticated;
revoke all privileges on table public.quiz_sessions from anon, authenticated;
revoke all privileges on table public.quiz_answers from anon, authenticated;
revoke all privileges on table public.battle_results from anon, authenticated;
revoke all privileges on table public.user_topic_mastery from anon, authenticated;
revoke all privileges on table public.user_content_progress from anon, authenticated;
revoke all privileges on table public.bookmarks from anon, authenticated;
revoke all privileges on table public.daily_user_activity from anon, authenticated;
revoke all privileges on table public.conversion_events from anon, authenticated;

-- Legacy battle tables are no longer used by the application. Remove their
-- direct client grants while retaining the data for rollback/history.
revoke all privileges on table public.battle_rooms from anon, authenticated;
revoke all privileges on table public.battle_room_questions from anon, authenticated;
revoke all privileges on table public.battle_answers from anon, authenticated;
revoke all privileges on table public.bot_answer_schedule from anon, authenticated;

revoke execute on function public.join_or_create_battle(text, text)
  from public, anon, authenticated;

-- Role checks are useful to authenticated middleware, never anonymous users.
revoke execute on function public.is_admin_or_editor() from public, anon;
grant execute on function public.is_admin_or_editor() to authenticated;

-- A deliberately narrow leaderboard surface. The underlying profile table
-- remains unavailable to browser clients, so private columns cannot leak.
create or replace function public.get_public_leaderboard(p_limit int default 20)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  rating int,
  xp int,
  league text
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select u.id, u.display_name, u.avatar_url, u.rating, u.xp, u.league
  from public.users u
  order by u.rating desc, u.xp desc, u.created_at asc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

revoke execute on function public.get_public_leaderboard(int) from public, anon;
grant execute on function public.get_public_leaderboard(int) to authenticated;

-- Signup metadata is untrusted input. Store only the fields the product uses,
-- constrain display names, and stop copying phone/city into the profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_display_name text;
  v_target_year int;
begin
  v_display_name := left(
    regexp_replace(
      trim(coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Player')),
      '[[:cntrl:]]',
      '',
      'g'
    ),
    80
  );
  if v_display_name = '' then
    v_display_name := 'Player';
  end if;

  if coalesce(new.raw_user_meta_data->>'target_exam_year', '') ~ '^(202[4-9]|203[0-5])$' then
    v_target_year := (new.raw_user_meta_data->>'target_exam_year')::int;
  end if;

  insert into public.users (id, display_name, target_exam_year)
  values (new.id, v_display_name, v_target_year);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Account deletion must remove linked learning data instead of being blocked
-- by legacy foreign keys or leaving identifiable analytics behind.
alter table public.battle_rooms
  drop constraint if exists battle_rooms_player1_id_fkey,
  add constraint battle_rooms_player1_id_fkey
    foreign key (player1_id) references public.users(id) on delete cascade;
alter table public.battle_rooms
  drop constraint if exists battle_rooms_player2_id_fkey,
  add constraint battle_rooms_player2_id_fkey
    foreign key (player2_id) references public.users(id) on delete cascade;
alter table public.battle_answers
  drop constraint if exists battle_answers_battle_room_id_fkey,
  add constraint battle_answers_battle_room_id_fkey
    foreign key (battle_room_id) references public.battle_rooms(id) on delete cascade;
alter table public.battle_answers
  drop constraint if exists battle_answers_user_id_fkey,
  add constraint battle_answers_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade;
alter table public.battle_results
  drop constraint if exists battle_results_battle_room_id_fkey,
  add constraint battle_results_battle_room_id_fkey
    foreign key (battle_room_id) references public.battle_rooms(id) on delete cascade;
alter table public.battle_results
  drop constraint if exists battle_results_user_id_fkey,
  add constraint battle_results_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade;
alter table public.user_topic_mastery
  drop constraint if exists user_topic_mastery_user_id_fkey,
  add constraint user_topic_mastery_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade;
alter table public.conversion_events
  drop constraint if exists conversion_events_user_id_fkey,
  add constraint conversion_events_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade;

-- Durable fixed-window rate limits. Keys are SHA-256 hashes generated by the
-- server, so raw IP addresses and user IDs are not stored in this table.
create table if not exists public.api_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count int not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;
revoke all privileges on table public.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.api_rate_limits to service_role;

create or replace function public.check_api_rate_limit(
  p_rate_key text,
  p_limit int,
  p_window_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
  v_started_at timestamptz;
  v_now timestamptz := now();
begin
  if p_rate_key is null or length(p_rate_key) < 16 then
    raise exception 'INVALID_RATE_KEY';
  end if;
  if p_limit < 1 or p_limit > 10000 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'INVALID_RATE_WINDOW';
  end if;

  insert into public.api_rate_limits (
    rate_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_rate_key, v_now, 1, v_now)
  on conflict (rate_key) do update
  set
    request_count = case
      when public.api_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else public.api_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.api_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else public.api_rate_limits.window_started_at
    end,
    updated_at = v_now
  returning request_count, window_started_at
  into v_count, v_started_at;

  if random() < 0.01 then
    delete from public.api_rate_limits
    where updated_at < v_now - interval '2 days';
  end if;

  return jsonb_build_object(
    'allowed', v_count <= p_limit,
    'remaining', greatest(p_limit - v_count, 0),
    'resetAt', extract(epoch from (v_started_at + make_interval(secs => p_window_seconds)))::bigint
  );
end;
$$;

revoke execute on function public.check_api_rate_limit(text, int, int)
  from public, anon, authenticated;
grant execute on function public.check_api_rate_limit(text, int, int)
  to service_role;

-- Complete a quiz session, apply rewards, update mastery, and write the result
-- in one transaction. Only the service role may invoke this function.
create or replace function public.complete_quiz_session(
  p_session_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.quiz_sessions%rowtype;
  v_profile public.users%rowtype;
  v_answer_count int;
  v_question_count int;
  v_player_score numeric;
  v_bot_score numeric;
  v_correct int;
  v_wrong int;
  v_skipped int;
  v_player_avg_ms int;
  v_bot_avg_ms int;
  v_winner text;
  v_won boolean;
  v_draw boolean;
  v_actual_score numeric;
  v_expected_score numeric;
  v_rating_change int;
  v_xp_earned int;
  v_new_rating int;
  v_new_xp int;
  v_new_streak int;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  select * into v_session
  from public.quiz_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if v_session.status = 'completed' then
    raise exception 'SESSION_ALREADY_COMPLETED';
  end if;
  if v_session.status <> 'active' then
    raise exception 'SESSION_NOT_ACTIVE';
  end if;

  v_question_count := jsonb_array_length(v_session.questions);

  select
    count(*)::int,
    coalesce(sum(points), 0),
    coalesce(sum(bot_points), 0),
    count(*) filter (where is_correct)::int,
    count(*) filter (where selected_option is not null and not is_correct)::int,
    count(*) filter (where selected_option is null)::int,
    coalesce(round(avg(time_ms) filter (where time_ms is not null)), 15000)::int,
    coalesce(round(avg(bot_time_ms)), 15000)::int
  into
    v_answer_count,
    v_player_score,
    v_bot_score,
    v_correct,
    v_wrong,
    v_skipped,
    v_player_avg_ms,
    v_bot_avg_ms
  from public.quiz_answers
  where session_id = p_session_id and user_id = p_user_id;

  if v_question_count <> 12 or v_answer_count <> v_question_count then
    raise exception 'SESSION_INCOMPLETE';
  end if;
  if exists (
    select 1
    from generate_series(0, v_question_count - 1) as expected(question_index)
    where not exists (
      select 1 from public.quiz_answers qa
      where qa.session_id = p_session_id
        and qa.user_id = p_user_id
        and qa.question_index = expected.question_index
    )
  ) then
    raise exception 'SESSION_INCOMPLETE';
  end if;

  -- Ranked outcome is score-only. Client-reported timing remains display data
  -- and cannot break a tie or affect rating.
  if v_player_score > v_bot_score then
    v_winner := 'player1';
    v_won := true;
    v_draw := false;
    v_actual_score := 1;
  elsif v_player_score < v_bot_score then
    v_winner := 'player2';
    v_won := false;
    v_draw := false;
    v_actual_score := 0;
  else
    v_winner := 'draw';
    v_won := false;
    v_draw := true;
    v_actual_score := 0.5;
  end if;

  select * into v_profile
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  v_expected_score := 1 / (1 + power(10::numeric, (1000 - v_profile.rating)::numeric / 400));
  v_rating_change := round(16 * (v_actual_score - v_expected_score))::int;
  v_xp_earned := 20
    + case when v_won then 30 else 0 end
    + least(v_profile.streak_current * 10, 100);
  v_new_rating := greatest(0, v_profile.rating + v_rating_change);
  v_new_xp := v_profile.xp + v_xp_earned;

  if v_profile.streak_last_date is null then
    v_new_streak := 1;
  elsif v_profile.streak_last_date = v_today then
    v_new_streak := v_profile.streak_current;
  elsif v_profile.streak_last_date = v_today - 1 then
    v_new_streak := v_profile.streak_current + 1;
  else
    v_new_streak := 1;
  end if;

  insert into public.battle_results (
    id,
    battle_room_id,
    quiz_session_id,
    user_id,
    is_bot,
    bot_profile_name,
    total_score,
    correct_count,
    wrong_count,
    skipped_count,
    avg_time_ms,
    rating_change,
    xp_earned,
    is_winner,
    created_at
  )
  values (
    gen_random_uuid(),
    null,
    p_session_id,
    p_user_id,
    false,
    v_session.bot_profile->>'name',
    v_player_score,
    v_correct,
    v_wrong,
    v_skipped,
    v_player_avg_ms,
    v_rating_change,
    v_xp_earned,
    v_won,
    now()
  );

  insert into public.daily_user_activity (
    user_id,
    activity_date,
    battles_completed,
    battles_won,
    xp_earned,
    streak_qualified,
    updated_at
  )
  values (
    p_user_id,
    v_today,
    1,
    case when v_won then 1 else 0 end,
    v_xp_earned,
    true,
    now()
  )
  on conflict (user_id, activity_date) do update
  set
    battles_completed = public.daily_user_activity.battles_completed + 1,
    battles_won = public.daily_user_activity.battles_won + case when v_won then 1 else 0 end,
    xp_earned = public.daily_user_activity.xp_earned + v_xp_earned,
    streak_qualified = true,
    updated_at = now();

  insert into public.user_topic_mastery (
    user_id,
    topic,
    total_questions,
    correct_count,
    mastery_pct,
    updated_at
  )
  select
    p_user_id,
    coalesce(qa.topic, 'polity'),
    count(*)::int,
    count(*) filter (where qa.is_correct)::int,
    round(100.0 * count(*) filter (where qa.is_correct) / count(*)),
    now()
  from public.quiz_answers qa
  where qa.session_id = p_session_id and qa.user_id = p_user_id
  group by coalesce(qa.topic, 'polity')
  on conflict (user_id, topic) do update
  set
    total_questions = public.user_topic_mastery.total_questions + excluded.total_questions,
    correct_count = public.user_topic_mastery.correct_count + excluded.correct_count,
    mastery_pct = round(
      100.0 * (public.user_topic_mastery.correct_count + excluded.correct_count)
      / nullif(public.user_topic_mastery.total_questions + excluded.total_questions, 0)
    ),
    updated_at = now();

  update public.users
  set
    rating = v_new_rating,
    xp = v_new_xp,
    league = case
      when v_new_xp >= 15000 then 'diamond'
      when v_new_xp >= 7000 then 'platinum'
      when v_new_xp >= 3000 then 'gold'
      when v_new_xp >= 1000 then 'silver'
      else 'bronze'
    end,
    battles_played = battles_played + 1,
    battles_won = battles_won + case when v_won then 1 else 0 end,
    streak_current = v_new_streak,
    streak_best = greatest(streak_best, v_new_streak),
    streak_last_date = v_today,
    last_active_at = now(),
    updated_at = now()
  where id = p_user_id;

  update public.quiz_sessions
  set
    status = 'completed',
    player_score = v_player_score,
    bot_score = v_bot_score,
    completed_at = now()
  where id = p_session_id;

  insert into public.conversion_events (
    id,
    user_id,
    event_type,
    cta_label,
    meta,
    path,
    created_at
  )
  values (
    gen_random_uuid(),
    p_user_id,
    'battle_complete',
    null,
    jsonb_build_object(
      'sessionId', p_session_id,
      'won', v_won,
      'playerScore', v_player_score,
      'botScore', v_bot_score
    ),
    '/battle',
    now()
  );

  return jsonb_build_object(
    'winner', v_winner,
    'won', v_won,
    'draw', v_draw,
    'playerScore', v_player_score,
    'botScore', v_bot_score,
    'correct', v_correct,
    'wrong', v_wrong,
    'skipped', v_skipped,
    'accuracy', round(100.0 * v_correct / v_answer_count),
    'playerAvgMs', v_player_avg_ms,
    'botAvgMs', v_bot_avg_ms,
    'ratingBefore', v_profile.rating,
    'ratingChange', v_rating_change,
    'newRating', v_new_rating,
    'xpEarned', v_xp_earned,
    'newXp', v_new_xp,
    'streak', v_new_streak
  );
end;
$$;

revoke execute on function public.complete_quiz_session(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.complete_quiz_session(uuid, uuid)
  to service_role;
