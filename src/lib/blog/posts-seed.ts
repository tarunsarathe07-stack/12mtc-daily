/**
 * Seed funnel blog posts — honest, useful CLAT-prep content that earns the
 * conversion CTA. Replace/extend via Supabase blog_posts in production.
 */

import type { BlogPost } from "@/lib/types/database";

export const SEED_BLOG_POSTS: BlogPost[] = [
  {
    id: "b1",
    title: "How to Prepare CLAT Current Affairs in 12 Minutes a Day",
    slug: "clat-current-affairs-12-minutes-a-day",
    excerpt:
      "Current affairs is ~25% of CLAT, but most aspirants cram a 300-page compilation in November. Here's a daily system that actually compounds — and takes 12 minutes.",
    category: "Strategy",
    author: "12 Minutes to CLAT Team",
    published_at: "2026-06-01T09:00:00+05:30",
    status: "published",
    cta: "start-daily",
    body: `## Why cramming current affairs fails

CLAT's current affairs section rewards *familiarity*, not memorisation. The passages give you context — what they test is whether you've seen the event before, know why it matters, and can reason around it.

A November cram gives you none of that. You're reading 10 months of news in 3 weeks, with no time to connect events to the legal and constitutional concepts CLAT actually frames questions around.

## The 12-minute daily system

- **Read 12 curated items (~9 minutes).** Not 40 headlines — 12 items chosen for CLAT relevance: polity, legal developments, economy, international affairs, environment, awards, reports.
- **Test yourself immediately (~3 minutes).** A 12-question quiz on what you just read, scored exactly like CLAT: +1 correct, −0.25 wrong. Retrieval right after reading is what moves things into long-term memory.
- **Let the archive accumulate.** By exam day you have months of organised, dated, already-tested coverage to revise from — instead of a panic-bought compilation.

## What "CLAT-relevant" actually means

Most news is noise for CLAT. The signal:

- Supreme Court and High Court judgments with constitutional angles
- Bills, amendments, and new legislation
- Appointments to constitutional bodies
- India's international agreements and multilateral positions
- RBI policy, budget, and major economic indicators
- Landmark reports and indices (who publishes what)

If a daily item can't be tied to one of these, it probably won't appear in CLAT.

## Consistency beats intensity

15 minutes daily for 10 months ≈ 75 hours of spaced, tested current-affairs prep. That beats any crash course — and it's the entire reason 12 Minutes Daily exists.`,
  },
  {
    id: "b2",
    title: "CLAT Negative Marking: How −0.25 Should Change Your Strategy",
    slug: "clat-negative-marking-strategy",
    excerpt:
      "One wrong answer erases a quarter of a correct one. Most aspirants either ignore negative marking or fear it too much. Both lose marks. Here's the math.",
    category: "Strategy",
    author: "12 Minutes to CLAT Team",
    published_at: "2026-05-25T09:00:00+05:30",
    status: "published",
    cta: "prepare-12mtc",
    body: `## The actual math

CLAT awards +1 for a correct answer and −0.25 for a wrong one. Blank answers cost nothing.

That means guessing blind among 4 options is *exactly break-even*: expected value = (0.25 × 1) + (0.75 × −0.25) ≈ 0.06. Practically zero.

But eliminate just **one** option and guessing turns profitable: (0.33 × 1) + (0.67 × −0.25) ≈ **+0.17 per question**. Eliminate two and it's +0.38.

## The three-tier rule

1. **Sure** → answer.
2. **Can eliminate at least one option** → answer. The math is on your side.
3. **Truly blind** → skip. You gain nothing and risk momentum.

## Why practice must use real scoring

If your daily practice gives +1/0 scoring, you train a guessing instinct that CLAT punishes. Every quiz on 12 Minutes Daily uses the real +1/−0.25 system, so the elimination discipline becomes automatic months before the exam.

## The takeaway

Negative marking isn't there to scare you — it's there to separate calibrated aspirants from impulsive ones. Train calibrated.`,
  },
  {
    id: "b3",
    title: "The CLAT Current Affairs Syllabus: What Actually Gets Asked",
    slug: "clat-current-affairs-syllabus-what-gets-asked",
    excerpt:
      "The consortium says 'current affairs including general knowledge.' That's not a syllabus. Here's the topic-by-topic breakdown of what CLAT passages are actually built from.",
    category: "CLAT Prep",
    author: "12 Minutes to CLAT Team",
    published_at: "2026-05-18T09:00:00+05:30",
    status: "published",
    cta: "join-12mtc",
    body: `## The format first

CLAT UG gives you ~4 current-affairs passages of ~450 words, each followed by 5-6 MCQs — roughly 25-30 questions, about a quarter of the paper. Questions test the event behind the passage, not the passage itself. If you know the event, the questions are fast marks.

## Where passages come from

- **Legal developments** — major SC/HC judgments, new legislation, criminal law reforms, constitutional amendments. The single highest-yield category.
- **Polity & governance** — elections, commissions, federal disputes, constitutional bodies and appointments.
- **International affairs** — India's treaties and FTAs, UN bodies, summits (G20, BRICS, COP), conflicts with Indian involvement.
- **Economy** — RBI decisions, budget highlights, GDP and inflation milestones, regulatory moves by SEBI.
- **Environment** — climate summits, landmark environmental judgments, protected-species news.
- **Awards, reports & indices** — Padma awards, Nobel prizes, major global indices and who publishes them.

## The pattern most aspirants miss

CLAT loves events with a **legal or constitutional hook**. An FTA is news; the constitutional process behind treaty ratification is CLAT. A new law is news; which entry of the Seventh Schedule empowers it is CLAT.

That's why every item on 12 Minutes Daily carries a "Why it matters for CLAT" note — the hook is the mark.

## How to use this

Audit your prep against the six categories above. If your daily reading over-indexes on political drama and under-indexes on judgments and reports, you're reading news, not preparing for CLAT.`,
  },
];
