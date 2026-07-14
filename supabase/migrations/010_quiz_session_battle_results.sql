-- ============================================================
-- 010: Link battle results to the server-authoritative quiz session
--
-- The current battle flow uses quiz_sessions. battle_results originally
-- referenced the legacy battle_rooms table, so inserting a quiz session ID
-- into battle_room_id failed at completion time.
-- ============================================================

alter table public.battle_results
  alter column battle_room_id drop not null;

alter table public.battle_results
  add column if not exists quiz_session_id uuid
    references public.quiz_sessions(id) on delete cascade;

create index if not exists idx_battle_results_quiz_session
  on public.battle_results(quiz_session_id);

create unique index if not exists uniq_player_result_per_quiz_session
  on public.battle_results(quiz_session_id, user_id)
  where quiz_session_id is not null and is_bot = false;
