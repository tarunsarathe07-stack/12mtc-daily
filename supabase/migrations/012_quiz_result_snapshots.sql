-- Persist the complete, server-computed result shown to a student so result
-- URLs remain recoverable after refresh and across devices.

alter table public.quiz_sessions
  add column if not exists result_summary jsonb;

comment on column public.quiz_sessions.result_summary is
  'Completed battle result snapshot. Written only by the service-role API.';
