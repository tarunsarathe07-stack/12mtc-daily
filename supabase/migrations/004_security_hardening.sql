-- ============================================================
-- 004: Security hardening
--
-- 001 already enables RLS on all tables with own-row policies for
-- student data and admin-gated reads for pipeline data. This migration
-- closes the remaining gaps and speeds up the role checks that the
-- middleware and admin guard run on every /admin request.
-- ============================================================

-- ── Fast role lookups (middleware + admin-guard query this per request) ──

create index if not exists idx_user_roles_user_role
  on public.user_roles(user_id, role);

-- ── Shared helper: is the current user admin or editor? ──
-- SECURITY DEFINER so policies using it don't recurse through
-- user_roles RLS.

create or replace function public.is_admin_or_editor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin', 'editor')
  );
$$;

-- ── Explicit mutation lockdown documentation ──
-- The following tables intentionally have NO insert/update/delete
-- policies for authenticated users. With RLS enabled, no policy means
-- DENIED — only the service-role key (server API routes) can write:
--
--   content_items          ← pipeline + admin approve/publish only
--   questions              ← pipeline + admin approval only
--   blog_posts             ← editorial, service-role only (003)
--   content_pipeline_runs  ← pipeline only
--   user_roles             ← bootstrap route / SQL console only
--   battle_results         ← server-computed only
--   bot_answer_schedule    ← server-generated only
--   user_topic_mastery     ← server-computed only
--
-- Students CAN write (own rows only, per 001):
--   user_content_progress, bookmarks, daily_user_activity,
--   battle_answers (insert own, is_bot = false), battle_rooms (insert as player1)

-- ── Guard the one risky student write: battle room spoofing ──
-- 001 lets players insert waiting rooms. Prevent updates by players
-- (state transitions are server-authoritative).
-- (No update policy existed; this documents and pins that intent.)

revoke update on public.battle_rooms from authenticated;
revoke update on public.battle_answers from authenticated;

-- ── Pipeline runs: let editors see runs too (001 was admin-only) ──

drop policy if exists "Pipeline runs visible to admins" on public.content_pipeline_runs;
create policy "Pipeline runs visible to admins and editors"
  on public.content_pipeline_runs for select
  to authenticated
  using (public.is_admin_or_editor());

-- ── Content items: replace the per-row EXISTS with the helper ──

drop policy if exists "Published content visible to all" on public.content_items;
create policy "Published content visible to all"
  on public.content_items for select
  to authenticated
  using (status = 'published' or public.is_admin_or_editor());

drop policy if exists "Questions visible in context" on public.questions;
create policy "Questions visible in context"
  on public.questions for select
  to authenticated
  using (status = 'approved' or public.is_admin_or_editor());

-- ============================================================
-- Verification queries (run manually after applying):
--
--   -- should be true for your admin user, false for a student:
--   select public.is_admin_or_editor();
--
--   -- as a student JWT, these must all return 0 rows / errors:
--   insert into public.user_roles (user_id, role) values (auth.uid(), 'admin');
--   update public.content_items set status = 'published' where true;
--   select * from public.content_items where status = 'review';
-- ============================================================
