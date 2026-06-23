import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, Clock, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getBlogSource } from "@/lib/blog/source";
import { Crown } from "@/components/brand/crown";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog — 12 Minutes to CLAT",
  description:
    "CLAT preparation strategy, current-affairs technique, and exam insights from 12 Minutes to CLAT. Honest advice for CLAT UG aspirants.",
};

/**
 * Funnel/SEO blog index — 12 Minutes to CLAT marketing content ONLY.
 * Current-affairs explainers live at /daily/[slug], never here.
 */
export default async function BlogIndexPage() {
  const posts = await getBlogSource().getAllPosts();
  const featured = posts[0];
  const remaining = posts.slice(1);
  const strategyPosts = remaining.filter((p) => p.category === "Strategy");
  const guidePosts = remaining.filter((p) => p.category !== "Strategy");

  return (
    <div className="min-h-dvh bg-mesh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10">
              <Crown size={27} />
            </span>
            <span className="text-sm font-black">12 Minutes Daily — Guides</span>
          </Link>
          <Link href="/today" className="rounded-xl bg-saffron px-4 py-2 text-sm font-black text-ink transition-all hover:-translate-y-0.5">
            Open App
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-12 px-4 py-8 sm:px-6 lg:py-14">
        <section className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1fr_360px] lg:items-end">
          <div className="max-w-3xl">
            <p className="editorial-kicker text-primary">CLAT strategy library</p>
            <h1 className="font-display mt-3 text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
              Guides that make the 12-minute habit sharper.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Simple guides for students who want a better current-affairs routine: what to read, how to revise, how to avoid negative marks, and when to test yourself.
            </p>
          </div>
          <div className="rounded-2xl bg-primary p-5 text-white premium-outline">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-saffron text-ink">
                <BookOpen className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black">Guides for the bigger plan</p>
                <p className="text-xs text-white/60">Strategy articles stay separate from daily news.</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/10 p-3">
                <Clock className="mb-2 h-4 w-4 text-saffron" />
                <p className="font-black tabular-nums">{posts.length}</p>
                <p className="text-xs text-white/55">published guides</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <GraduationCap className="mb-2 h-4 w-4 text-saffron" />
                <p className="font-black">CLAT UG</p>
                <p className="text-xs text-white/55">prep strategy</p>
              </div>
            </div>
          </div>
        </section>

        {featured && (
          <Link href={`/blog/${featured.slug}`} className="group grid gap-0 overflow-hidden rounded-[1.5rem] bg-card premium-outline lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-6 sm:p-8">
              <p className="editorial-kicker text-saffron">Featured guide</p>
              <h2 className="font-display mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                {featured.title}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {featured.excerpt}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition-all group-hover:-translate-y-0.5">
                Read featured guide <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="flex min-h-[260px] flex-col justify-between bg-primary p-6 text-white sm:p-8">
              <div>
                <p className="editorial-kicker text-white/45">12 Minutes to CLAT</p>
                <div className="mt-3 flex h-20 w-20 items-center justify-center rounded-[1.65rem] bg-white text-primary">
                  <Crown size={58} animateTips />
                </div>
              </div>
              <p className="max-w-sm text-sm leading-7 text-white/70">
                Strategy is easier to follow when it is practical. These guides help you turn current affairs, mocks, and revision into a daily system.
              </p>
            </div>
          </Link>
        )}

        <EditorialSection title="Exam Strategy" eyebrow="Where aspirants lose marks before the paper begins" posts={strategyPosts} offset={featured ? 1 : 0} />
        <EditorialSection title="Popular CLAT Guides" eyebrow="Systems, not motivation" posts={guidePosts} offset={(featured ? 1 : 0) + strategyPosts.length} />

        {posts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No blog posts published yet.
            </CardContent>
          </Card>
        )}

        <div className="ink-panel overflow-hidden rounded-2xl p-6 text-center sm:p-8">
          <p className="font-display text-xl font-semibold sm:text-2xl">Reading about strategy is step one. The habit is the strategy.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/55">12 current-affairs cards and a 12-question quiz, every day, free to start.</p>
          <Link href="/today" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-saffron px-6 py-2.5 text-sm font-black text-ink transition-all hover:-translate-y-0.5">
            Start 12 Minutes Daily <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}

function EditorialSection({
  title,
  eyebrow,
  posts,
  offset,
}: {
  title: string;
  eyebrow: string;
  posts: Awaited<ReturnType<ReturnType<typeof getBlogSource>["getAllPosts"]>>;
  offset: number;
}) {
  if (posts.length === 0) return null;

  return (
    <section className="space-y-5">
      <div>
        <p className="editorial-kicker text-muted-foreground">{eyebrow}</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {posts.map((post, index) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group grid gap-3 py-6 transition-colors hover:bg-white/45 sm:grid-cols-[72px_1fr_auto] sm:items-baseline sm:px-3">
            <span className="tabular-heading text-3xl font-black text-muted-foreground/25 transition-colors group-hover:text-saffron">
              {String(offset + index + 1).padStart(2, "0")}
            </span>
            <span>
              <span className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-saffron-soft text-[10px] uppercase tracking-[0.14em] text-[#8a5200]">
                  {post.category}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </span>
              <span className="font-display block text-xl font-semibold leading-tight tracking-tight transition-colors group-hover:text-primary sm:text-2xl">
                {post.title}
              </span>
              <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {post.excerpt}
              </span>
            </span>
            <span className="hidden items-center gap-1 text-sm font-black text-primary sm:flex">
              Read <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
