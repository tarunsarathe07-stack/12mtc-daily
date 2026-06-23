-- ============================================================
-- Atomic Matchmaking Function
-- Uses FOR UPDATE SKIP LOCKED for safe concurrency
-- ============================================================

create or replace function public.join_or_create_battle(
  p_mode text,
  p_topic text default null
) returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_existing_waiting uuid;
begin
  -- Safety: must be authenticated
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Guard: prevent user from having multiple active waiting rooms
  select id into v_existing_waiting
  from public.battle_rooms
  where player1_id = v_user_id
    and status = 'waiting'
  limit 1;

  if v_existing_waiting is not null then
    return v_existing_waiting;
  end if;

  -- Try to atomically claim a waiting room
  select id into v_room_id
  from public.battle_rooms
  where status = 'waiting'
    and player2_id is null
    and is_bot_match = false
    and mode = p_mode
    and (
      (p_mode = 'daily' and topic is null)
      or (p_mode = 'topic' and topic = p_topic)
    )
    and player1_id != v_user_id
  order by created_at asc
  limit 1
  for update skip locked;

  if v_room_id is not null then
    -- Join existing room
    update public.battle_rooms
    set player2_id = v_user_id,
        status = 'countdown',
        started_at = now()
    where id = v_room_id;
  else
    -- Create new waiting room
    insert into public.battle_rooms (mode, topic, player1_id, status)
    values (p_mode, p_topic, v_user_id, 'waiting')
    returning id into v_room_id;
  end if;

  return v_room_id;
end;
$$ language plpgsql security definer;
