"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
    fetch("/api/content/published", { cache: "no-store" })
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
    label: "Read today&apos;s 12",
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
                <h1 className="display-title mt-3 text-4xl sm:text-5xl lg:text-6xl">Build today&apos;s momentum</h1>
                <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">One mission: finish the 12, take the quiz, revise what needs work.</p>
              </div>
              <div className="stitch-pill grid grid-cols-3 gap-1 p-1.5 md:min-w-[340px]">
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

          <section className="stitch-saffron-panel mb-10 overflow-hidden rounded-[2.4rem] p-6 text-ink sm:p-9">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-65">Next up</p>
                <h2 className="display-title mt-3 text-4xl sm:text-5xl">{isDone ? "Quiz is ready" : "Read today&apos;s 12"}</h2>
                <p className="mt-3 max-w-lg text-base font-medium leading-7 opacity-75" dangerouslySetInnerHTML={{ __html: nextAction.helper }} />
              </div>
              <Link href={nextAction.href} className="group flex h-20 w-20 items-center justify-center rounded-full bg-white/45 text-ink shadow-inner transition-transform hover:scale-105 md:h-24 md:w-24" aria-label={nextAction.label}>
                <ArrowRight className="h-9 w-9 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </section>

          <div className="mb-8 flex items-start gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm shadow-sm ring-1 ring-border/60">
            <Radio className="mt-0.5 h-4 w-4 shrink-0 text-saffron" />
            <p className="leading-6 text-muted-foreground"><span className="font-black text-foreground">Status:</span> {todayItems.length || visibleQueue.length} cards live today. Editors approve cards before they become student content.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.25fr]">
            <section className="stitch-card rounded-[2rem] p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight"><Target className="h-5 w-5 text-primary" /> Weak topic drills</h2>
                <span className="rounded-full bg-saffron-soft px-3 py-1 text-xs font-black text-[#8a5200]">personal</span>
              </div>
              <div className="mt-4 space-y-4">
                {!progressLoaded ? Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-muted" />) : weakTopics.length === 0 ? (
                  <p className="py-4 text-sm leading-6 text-muted-foreground">Take one quiz and weak-topic drills will appear here.</p>
                ) : weakTopics.map((topic) => (
                  <Link key={topic.topic} href={`/battle/queue?mode=topic&topic=${topic.topic}`} className="group block rounded-2xl px-1 py-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-black capitalize tracking-tight">{topic.topic}</p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, topic.mastery_pct)}%` }} /></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-saffron/15 px-3 py-1 text-xs font-black text-[#8a5200]">{topic.mastery_pct}%</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                ))}
                <Link href="/battle" className="mt-4 flex h-11 items-center justify-center rounded-full border border-primary px-4 text-sm font-black text-primary transition hover:bg-primary hover:text-white">Start targeted session</Link>
              </div>
            </section>

            <section className="stitch-card rounded-[2rem] p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight"><Zap className="h-5 w-5 text-primary" /> Live source feed</h2>
                <span className="stitch-pill px-3 py-1 text-xs font-bold text-muted-foreground">updated just now</span>
              </div>
              <div className="mt-4 space-y-4">
                {visibleQueue.slice(0, 3).map((item) => (
                  <Link key={item.id} href={`/daily/${item.slug}`} className="group grid grid-cols-[76px_1fr] gap-4 rounded-2xl p-1.5 transition hover:bg-muted/60">
                    <div className="h-20 overflow-hidden rounded-2xl bg-primary/10">
                      {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#ececf8,#fff0d3)]"><BookOpen className="h-6 w-6 text-primary" /></div>}
                    </div>
                    <div className="min-w-0 py-1">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-primary">{sourceName(item)} <span className="text-muted-foreground">· {item.is_demo ? "Demo" : "Reviewed"}</span></p>
                      <p className="mt-1 line-clamp-2 text-base font-bold leading-snug tracking-tight">{item.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link href="/shorts?day=saved" className="stitch-card flex items-center gap-3 rounded-[1.5rem] p-4">
              <Bookmark className="h-5 w-5 text-saffron" /><span className="font-black">Saved cards</span><span className="ml-auto text-sm text-muted-foreground">{savedItems.length}</span>
            </Link>
            <Link href="/shorts?day=yesterday" className="stitch-card flex items-center gap-3 rounded-[1.5rem] p-4">
              <BookOpen className="h-5 w-5 text-primary" /><span className="font-black">Revise yesterday</span><ArrowRight className="ml-auto h-4 w-4" />
            </Link>
            <Link href="/battle" className="stitch-card flex items-center gap-3 rounded-[1.5rem] p-4">
              <Swords className="h-5 w-5 text-saffron" /><span className="font-black">Quiz battle</span><ArrowRight className="ml-auto h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-full px-4 py-2 text-center">
      <p className="tabular-heading text-xl font-black text-primary">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
    </div>
  );
}
