"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bookmark, BookOpen, Radio, Swords, Target, Zap } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { getPublishedContent, MOCK_MASTERY, MOCK_USER } from "@/lib/mock-data";
import { istToday } from "@/lib/utils/date";
import type { ContentItem } from "@/lib/types/database";

const DAILY_TARGET = 12;
const SHOW_LOCAL_DEMO = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

function itemDate(item: ContentItem): string {
  return item.content_date ?? (item.published_at ?? item.created_at).slice(0, 10);
}

function sourceName(item: ContentItem): string {
  const cited = item.citations?.[0]?.source;
  if (cited) return cited;
  try {
    return new URL(item.source_urls[0]).hostname.replace("www.", "");
  } catch {
    return "Curated";
  }
}

interface ServerProgress {
  readToday: number;
  streak: number;
  xp: number;
  rating: number;
  weakTopics: Array<{ topic: string; mastery_pct: number }>;
  readIds: string[];
  bookmarks: string[];
}

export default function TodayPage() {
  const [allContent, setAllContent] = useState<ContentItem[]>(() => SHOW_LOCAL_DEMO ? getPublishedContent() : []);
  const [progress, setProgress] = useState<ServerProgress>({
    readToday: 0,
    streak: MOCK_USER.streak_current,
    xp: MOCK_USER.xp,
    rating: MOCK_USER.rating,
    weakTopics: [...MOCK_MASTERY].sort((a, b) => a.mastery_pct - b.mastery_pct).slice(0, 4).map((m) => ({ topic: m.topic, mastery_pct: m.mastery_pct })),
    readIds: [],
    bookmarks: [],
  });
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/content/published?date=${istToday()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.items)) setAllContent(data.items); })
      .catch(() => {});

    fetch("/api/progress/today", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.readToday === "number") {
          setProgress({
            readToday: data.readToday,
            streak: data.streak,
            xp: data.xp,
            rating: data.rating,
            weakTopics: Array.isArray(data.weakTopics) ? data.weakTopics : [],
            readIds: Array.isArray(data.readIds) ? data.readIds : [],
            bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setProgressLoaded(true));
  }, []);

  const todayStr = istToday();
  const todayItems = allContent.filter((i) => itemDate(i) === todayStr);
  const visibleQueue = todayItems.length ? todayItems : allContent.slice(0, DAILY_TARGET);
  const readToday = Math.min(progress.readToday, DAILY_TARGET);
  const isDone = readToday >= DAILY_TARGET;
  const todayLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const weakTopics = progress.weakTopics.slice(0, 2);
  const savedItems = allContent.filter((item) => progress.bookmarks.includes(item.id)).slice(0, 3);

  const nextAction = useMemo(() => isDone ? {
    label: "Take today\'s quiz",
    href: "/battle/queue?mode=daily",
    helper: "12 questions with +1 / -0.25 scoring.",
  } : {
    label: "Read today's 12",
    href: "/shorts",
    helper: `${DAILY_TARGET - readToday} cards left in your daily loop.`,
  }, [isDone, readToday]);

  return (
    <>
      <TopBar streak={progress.streak} />
      <main className="min-h-dvh stitch-shell">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <section className="mb-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="editorial-kicker text-primary">{todayLabel} · Daily loop</p>
                <h1 className="display-title mt-2 text-3xl sm:text-4xl">Build today&apos;s momentum</h1>
                <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">One mission: finish the 12, take the quiz, revise what needs work.</p>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-white p-1.5 md:min-w-[320px]">
                <MiniStat value={`${readToday}/12`} label="read" />
                <MiniStat value={`${progress.streak}`} label="streak" />
                <MiniStat value={`${progress.rating}`} label="rating" />
              </div>
            </div>
          </section>

          <section className="mb-8 space-y-3">
            <div className="flex items-center justify-between">
              <p className="editorial-kicker text-muted-foreground">Daily progress</p>
              <p className="text-sm font-black text-saffron">{readToday} / {DAILY_TARGET}</p>
            </div>
            <div className="grid grid-cols-12 gap-1.5">
              {Array.from({ length: DAILY_TARGET }).map((_, index) => (
                <Link
                  key={index}
                  href={visibleQueue[index] ? `/daily/${visibleQueue[index].slug}` : "/shorts"}
                  className="stitch-progress-segment transition-transform hover:-translate-y-0.5"
                  data-active={index < readToday}
                  aria-label={`Daily card ${index + 1}`}
                />
              ))}
            </div>
          </section>

          <section className="stitch-saffron-panel mb-8 overflow-hidden rounded-lg p-5 sm:p-7">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-bold text-primary">Next up</p>
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{isDone ? "Quiz is ready" : "Read today's 12"}</h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{nextAction.helper}</p>
              </div>
              <Link href={nextAction.href} className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white shadow-[0_3px_0_#236448] transition-transform hover:-translate-y-0.5" aria-label={nextAction.label}>
                {nextAction.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </section>

          <div className="mb-8 flex items-start gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm shadow-sm ring-1 ring-border/60">
            <Radio className="mt-0.5 h-4 w-4 shrink-0 text-saffron" />
            <p className="leading-6 text-muted-foreground"><span className="font-black text-foreground">12 cards ready today.</span> Updated for today&apos;s exam prep.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.25fr]">
            <section className="stitch-card rounded-lg p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h2 className="flex items-center gap-2 text-lg font-bold"><Target className="h-5 w-5 text-primary" /> Weak topic drills</h2>
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Personal</span>
              </div>
              <div className="mt-4 space-y-4">
                {!progressLoaded ? Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-muted" />) : weakTopics.length === 0 ? (
                  <p className="py-4 text-sm leading-6 text-muted-foreground">Take one quiz and weak-topic drills will appear here.</p>
                ) : weakTopics.map((topic) => (
                  <Link key={topic.topic} href={`/battle/queue?mode=topic&topic=${topic.topic}`} className="group block rounded-lg px-2 py-2 hover:bg-muted/60">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold capitalize">{topic.topic}</p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, topic.mastery_pct)}%` }} /></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{topic.mastery_pct}%</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                ))}
                <Link href="/battle" className="mt-4 flex h-11 items-center justify-center rounded-lg border border-primary px-4 text-sm font-bold text-primary transition hover:bg-primary hover:text-white">Start targeted session</Link>
              </div>
            </section>

            <section className="stitch-card rounded-lg p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h2 className="flex items-center gap-2 text-lg font-bold"><Zap className="h-5 w-5 text-primary" /> Today&apos;s source feed</h2>
                <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Updated</span>
              </div>
              <div className="mt-4 space-y-4">
                {visibleQueue.slice(0, 3).map((item) => (
                  <Link key={item.id} href={`/daily/${item.slug}`} className="group grid grid-cols-[76px_1fr] gap-4 rounded-lg p-1.5 transition hover:bg-muted/60">
                    <div className="h-20 overflow-hidden rounded-lg bg-primary/10">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt=""
                          width={76}
                          height={80}
                          sizes="76px"
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#ececf8,#fff0d3)]"><BookOpen className="h-6 w-6 text-primary" /></div>}
                    </div>
                    <div className="min-w-0 py-1">
                      <p className="text-xs font-semibold text-primary">{sourceName(item)} <span className="text-muted-foreground">· {item.is_demo ? "Demo" : "Reviewed"}</span></p>
                      <p className="mt-1 line-clamp-2 text-base font-semibold leading-snug">{item.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link href="/shorts?day=saved" className="stitch-card flex items-center gap-3 rounded-lg p-4 transition hover:border-primary/25">
              <Bookmark className="h-5 w-5 text-primary" /><span className="font-semibold">Saved cards</span><span className="ml-auto text-sm text-muted-foreground">{savedItems.length}</span>
            </Link>
            <Link href="/shorts?day=yesterday" className="stitch-card flex items-center gap-3 rounded-lg p-4 transition hover:border-primary/25">
              <BookOpen className="h-5 w-5 text-primary" /><span className="font-semibold">Revise yesterday</span><ArrowRight className="ml-auto h-4 w-4" />
            </Link>
            <Link href="/battle" className="stitch-card flex items-center gap-3 rounded-lg p-4 transition hover:border-primary/25">
              <Swords className="h-5 w-5 text-[#2f6fbd]" /><span className="font-semibold">Quiz battle</span><ArrowRight className="ml-auto h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md px-4 py-2 text-center">
      <p className="tabular-heading text-lg font-bold text-primary">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
