-- ============================================================
-- 007: Narrow service-role grants for production app writes
--
-- The app's server routes use the Supabase service role for trusted writes:
-- content pipeline/admin actions, student progress, quiz sessions, and
-- funnel events. These grants are explicit per table instead of a broad
-- schema-wide grant.
-- ============================================================

grant usage on schema public to service_role;

-- Auth/profile/admin checks
grant select, update on public.users to service_role;
grant select, insert on public.user_roles to service_role;

-- Current-affairs pipeline + admin review/publish
grant select, insert, update, delete on public.content_items to service_role;
grant select, insert, update, delete on public.questions to service_role;
grant select, insert, update on public.content_pipeline_runs to service_role;

-- Funnel blog content
grant select, insert, update, delete on public.blog_posts to service_role;

-- Student-owned persistence via server routes
grant select, insert, update, delete on public.user_content_progress to service_role;
grant select, insert, update, delete on public.bookmarks to service_role;
grant select, insert, update, delete on public.daily_user_activity to service_role;
grant select, insert, update, delete on public.user_topic_mastery to service_role;
grant select, insert, update, delete on public.quiz_sessions to service_role;
grant select, insert, update, delete on public.quiz_answers to service_role;
grant select, insert, update, delete on public.battle_results to service_role;
grant select, insert, update, delete on public.conversion_events to service_role;

-- Legacy/realtime battle tables retained by the schema
grant select, insert, update, delete on public.battle_rooms to service_role;
grant select, insert, update, delete on public.battle_room_questions to service_role;
grant select, insert, update, delete on public.battle_answers to service_role;
grant select, insert, update, delete on public.bot_answer_schedule to service_role;
