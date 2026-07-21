-- Preserve earlier generated questions for audit while allowing student-facing
-- reads to require the stricter grounded-context validation contract.

alter table public.questions
  add column if not exists validation_version integer not null default 0
  check (validation_version >= 0);

comment on column public.questions.validation_version is
  '0 = legacy/unversioned; 1 = generated under grounded dual-pool validation.';

create index if not exists idx_questions_context_validation
  on public.questions(content_item_id, status, validation_version)
  where purpose = 'context';
