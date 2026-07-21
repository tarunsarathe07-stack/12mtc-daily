-- Separate questions used for the daily news quiz from the broader
-- topic-context questions shown inside each learning card.

alter table public.questions
  add column if not exists purpose text not null default 'daily_news'
  check (purpose in ('daily_news', 'context'));

comment on column public.questions.purpose is
  'daily_news = source-grounded daily quiz; context = broader topic deep-dive shown on the card.';

create index if not exists idx_questions_purpose_content
  on public.questions(purpose, content_item_id, status);
