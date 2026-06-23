# 12 Minutes Daily — Production Setup

A 12 Minutes to CLAT product. This checklist takes the app from local mock
mode to production mode (Supabase + protected admin + live content pipeline).

---

## Modes at a glance

| Mode | `NEXT_PUBLIC_MOCK_MODE` | Supabase creds | Behavior |
|---|---|---|---|
| **Local demo** | `true` | placeholders | Mock data + local JSON store, auth bypassed, admin open |
| **Misconfigured** (fail-closed) | `false` | placeholders | Public pages render; app pages redirect to `/`; all mutations return 503 |
| **Production** | `false` | real | Supabase reads/writes, auth required, admin role-gated |

The switch is automatic: real credentials + mock mode off ⇒ production path.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Pick a region close to India (e.g. `ap-south-1` Mumbai) — your users are IST.
3. Note down from **Project Settings → API**:
   - Project URL (`https://<ref>.supabase.co`)
   - `anon` public key
   - `service_role` key (server-only — never expose to the client)

## 2. Run the migrations (in order)

In **SQL Editor**, run each file from `supabase/migrations/`:

1. `001_initial_schema.sql` — all tables, indexes, RLS policies, auth trigger
2. `002_matchmaking_function.sql` — atomic `join_or_create_battle()`
3. `003_daily_archive_and_blogs.sql` — `content_date` + `daily_slot` (1-12), `blog_posts`, public read policies
4. `004_security_hardening.sql` — role-check helper, write lockdowns, role index

Or with the Supabase CLI: `supabase db push`.

## 3. Set environment variables

In `.env.local` (and in Vercel → Project → Environment Variables):

```env
# Turn OFF mock mode for production
NEXT_PUBLIC_MOCK_MODE=false

# Supabase (from step 1)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>

# Admin bootstrap + cron auth — generate with: openssl rand -hex 32
ADMIN_DEV_KEY=<long random string>

# Claude API for the content pipeline (console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 4. Create the first admin

1. Sign up normally in the app (`/signup`) with your email and confirm it.
2. Assign yourself the admin role (requires `ADMIN_DEV_KEY`; there is no
   public self-escalation path):

```bash
curl -X POST https://your-domain.com/api/admin/bootstrap \
  -H "x-admin-key: $ADMIN_DEV_KEY" \
  -H "content-type: application/json" \
  -d '{"email":"you@example.com","role":"admin"}'
```

3. Log out and back in → `/admin` is now accessible.
   (Alternative: insert into `user_roles` directly in the SQL editor.)

Grant additional reviewers the `editor` role the same way.

## 5. Run the pipeline

```bash
# Dry run — RSS discovery + CLAT relevance scoring only, no Claude calls
curl -X POST "https://your-domain.com/api/content/ingest?dryRun=1" \
  -H "x-admin-key: $ADMIN_DEV_KEY"

# Full ingest — generates up to 12 items (shorts + explainer + 3-5 MCQs each)
curl -X POST "https://your-domain.com/api/content/ingest?limit=12" \
  -H "x-admin-key: $ADMIN_DEV_KEY"
```

Or click **Dry Run** / **Run Full Pipeline** in `/admin` while logged in as admin.

Then review in `/admin/content`: **Approve & Publish** assigns the next free
`daily_slot` (1-12) for today's IST date. Nothing auto-publishes — generated
content sits in `review` until an admin acts.

**Daily automation:** add a Vercel Cron hitting the ingest URL (with the
`x-admin-key` header) at ~6:00 IST, then approve the day's 12 in the morning.

## 6. Verify

- `/` and `/blog` load logged-out (public).
- `/today` redirects to `/login` when logged out.
- `/admin` redirects non-admins to `/today`.
- `POST /api/content/approve` without auth → 401/403.
- `/admin` shows "Today's edition: X/12 ready" with the slot grid.
- `GET /api/content/published?date=YYYY-MM-DD` returns that day's items —
  old dates keep working forever (append-only archive).

---

## Operational invariants (do not break)

1. **Never auto-publish** — `published` status is only set by the admin approve route.
2. **Never delete daily content** — no delete path exists; reject = status flip.
3. **Blogs ≠ current affairs** — `blog_posts` table / `/blog` vs `content_items` / `/daily`.
4. **All times IST** — `content_date` uses Asia/Kolkata.
5. **Service role key stays server-side** — it bypasses RLS by design.

## Costs (production, ~12 items/day)

| Service | Plan | Cost |
|---|---|---|
| Supabase | Free tier (500MB, 50K MAU) | $0 to start |
| Vercel | Hobby | $0 to start |
| Claude Haiku | ~12 items/day ≈ 60K tokens/day | ~$5-7/month |
