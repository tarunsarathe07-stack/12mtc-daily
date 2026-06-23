-- ============================================================
-- 003: Daily archive (content_date + daily_slot) and funnel blogs
--
-- Current affairs: one edition of 12 items per IST day, keyed by
-- content_date. Append-only — old dates are NEVER deleted.
-- Blogs: separate funnel/marketing content, never mixed with
-- current affairs.
-- ============================================================

-- ── Current affairs: daily edition columns ──────────────────

alter table public.content_items
  add column if not exists content_date date,
  add column if not exists daily_slot int
    check (daily_slot is null or (daily_slot >= 1 and daily_slot <= 12));

-- Backfill content_date for existing rows from published/created time (IST)
update public.content_items
set content_date = coalesce(
  (published_at at time zone 'Asia/Kolkata')::date,
  (created_at at time zone 'Asia/Kolkata')::date
)
where content_date is null;

-- One item per slot per day (only for slotted, published items)
create unique index if not exists uniq_daily_slot_per_date
  on public.content_items(content_date, daily_slot)
  where daily_slot is not null;

-- Archive reads are by content_date
create index if not exists idx_content_items_content_date
  on public.content_items(content_date desc, daily_slot asc);

create index if not exists idx_content_items_date_status
  on public.content_items(content_date, status);

-- ── Funnel blog posts (separate model — marketing/SEO only) ──

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text not null,
  body text not null,                -- markdown
  category text not null default 'CLAT Prep',
  author text not null default '12 Minutes to CLAT Team',
  status text not null default 'draft'
    check (status in ('draft','published')),
  cta text not null default 'start-daily'
    check (cta in ('start-daily','join-12mtc','save-streak','prepare-12mtc')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_blog_posts_published
  on public.blog_posts(status, published_at desc)
  where status = 'published';

-- ── RLS ──────────────────────────────────────────────────────

alter table public.blog_posts enable row level security;

-- Anyone (including anon) can read published blog posts — they are public SEO pages
drop policy if exists "blog_posts_read_published" on public.blog_posts;
create policy "blog_posts_read_published"
  on public.blog_posts for select
  using (status = 'published');

-- Mutations only via service role (no insert/update/delete policies for users)

-- Published current affairs readable by everyone (students + anon landing)
drop policy if exists "content_items_read_published_anon" on public.content_items;
create policy "content_items_read_published_anon"
  on public.content_items for select
  using (status = 'published');

-- ============================================================
-- NOTE: content rows are append-only by convention. There is no
-- delete path in application code; admin "reject" only flips status.
-- ============================================================
