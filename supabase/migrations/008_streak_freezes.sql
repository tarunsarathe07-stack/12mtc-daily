-- ============================================================
-- 008 — Streak freezes
-- A small bank of "freezes" lets a student miss a day without losing
-- their streak. Earned at 7-day milestones, capped in app logic.
-- ============================================================

alter table public.users
  add column if not exists streak_freezes int not null default 0;
