"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Swords, Bookmark, Search, X, Flame, Sparkles, ArrowRight } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { CardStack } from "@/components/cards/card-stack";
import { CardSkeleton } from "@/components/cards/card-skeleton";
import { getPublishedContent, MOCK_USER } from "@/lib/mock-data";
import { istToday, istDaysAgo, istDateLabel } from "@/lib/utils/date";
import type { ContentItem } from "@/lib/types/database";
import { cn } from "@/lib/utils";

/**
 * Shorts deck with a real archive: one chip per news day (revise any
 * older day), plus Saved (bookmarks) and All. Deep-linkable via
 * /shorts?day=YYYY-MM-DD | today | yesterday | saved.
 */

type Filter = "all" | "saved" | string; // string = YYYY-MM-DD

function itemDate(item: ContentItem): string {
  return (
    item.content_date ?? (item.published_at ?? item.created_at).slice(0, 10)
  );
}

const MAX_DATE_CHIPS = 5;
const SHOW_LOCAL_DEMO = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export default function ShortsPage() {
  const [items, setItems] = useState<ContentItem[]>(() =>
    SHOW_LOCAL_DEMO ? getPublishedContent() : []
  );
  const [itemsLoading, setItemsLoading] = useState(!SHOW_LOCAL_DEMO);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<Filter>(istToday());
  const [query, setQuery] = useState("");
  const [onLastCard, setOnLastCard] = useState(false);
  const [streak, setStreak] = useState(MOCK_USER.streak_current);
  const [bookmarkIds, setBookmarkIds] = useState<string[]>([]);
  const [celebrate, setCelebrate] = useState(false);
  const readSent = useRef(new Set<string>());
  const completionLogged = useRef(false);

  // Deep link: /shorts?day=...
  useEffect(() => {
    const day = new URLSearchParams(window.location.search).get("day");
    if (!day) return;
    if (day === "today") setFilter(istToday());
    else if (day === "yesterday") setFilter(istDaysAgo(1));
    else if (day === "saved" || day === "all") setFilter(day);
    else if (/^\d{4}-\d{2}-\d{2}$/.test(day)) setFilter(day);
  }, []);

  // Unified published list. Production shows only Supabase-published content;
  // local mock mode may use demo cards so the interaction can be previewed.
  useEffect(() => {
    fetch("/api/content/published", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("content");
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data.items)) setItems(data.items);
      })
      .catch(() => setLoadError(true))
      .finally(() => setItemsLoading(false));
    fetch("/api/progress/today", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.streak === "number") setStreak(data.streak);
        if (Array.isArray(data.bookmarks)) setBookmarkIds(data.bookmarks);
        if (Array.isArray(data.readIds)) {
          for (const id of data.readIds) readSent.current.add(id);
        }
      })
      .catch(() => {});
  }, []);

  // Available news days, newest first
  const dates = useMemo(() => {
    const set = new Set(items.map(itemDate));
    return [...set].sort((a, b) => b.localeCompare(a)).slice(0, MAX_DATE_CHIPS);
  }, [items]);

  const filtered = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) =>
        itemDate(b).localeCompare(itemDate(a)) ||
        (a.daily_slot ?? 99) - (b.daily_slot ?? 99)
    );
    // Search spans the whole archive, ignoring the day filter
    const q = query.trim().toLowerCase();
    if (q) {
      return sorted.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.topic_tags.some((t) => t.includes(q))
      );
    }
    if (filter === "all") return sorted;
    if (filter === "saved") return sorted.filter((i) => bookmarkIds.includes(i.id));
    return sorted.filter((i) => itemDate(i) === filter);
  }, [items, filter, bookmarkIds, query]);

  const handleActiveCard = useCallback(
    (item: ContentItem, index: number) => {
      setOnLastCard(index === filtered.length - 1 && filtered.length > 1);

      if (readSent.current.has(item.id)) return;
      readSent.current.add(item.id);

      fetch("/api/progress/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentItemId: item.id }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.streak === "number") setStreak(data.streak);
          if (
            data.newlyRead &&
            !completionLogged.current &&
            typeof data.readToday === "number" &&
            data.readToday >= Math.min(12, filtered.length)
          ) {
            completionLogged.current = true;
            setCelebrate(true);
            fetch("/api/events", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                eventType: "read_12_complete",
                meta: { readToday: data.readToday },
                path: "/shorts",
              }),
            }).catch(() => {});
          }
        })
        .catch(() => {
          readSent.current.delete(item.id);
        });
    },
    [filtered.length]
  );

  const handleBookmark = useCallback((item: ContentItem) => {
    setBookmarkIds((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    );
    fetch("/api/bookmarks/toggle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentItemId: item.id }),
    }).catch(() => {});
  }, []);

  return (
    <>
      <TopBar title="News" streak={streak} />

      {loadError && (
        <div className="mx-auto mt-3 flex w-full max-w-7xl items-center justify-between gap-3 rounded-2xl border border-coral/30 bg-coral-soft px-4 py-3 text-sm sm:px-6 lg:px-8">
          <p className="font-medium text-foreground">Couldn&apos;t load the news — check your connection.</p>
          <button
            onClick={() => window.location.reload()}
            className="shrink-0 rounded-full bg-coral px-3 py-1.5 text-xs font-black text-white transition hover:opacity-90"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search the whole archive */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search news — try “RBI” or “Supreme Court”"
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {query && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {filtered.length} result{filtered.length === 1 ? "" : "s"} across all days
          </p>
        )}
      </div>

      {/* Day switcher — pick any past day and revise it */}
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto px-4 pt-3 sm:px-6 lg:px-8">
        {dates.map((d) => {
          const count = items.filter((i) => itemDate(i) === d).length;
          return (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                filter === d
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {istDateLabel(d)}
              <span className="ml-1 opacity-70">({count})</span>
            </button>
          );
        })}
        <button
          onClick={() => setFilter("saved")}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            filter === "saved"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          <Bookmark className="h-3 w-3" />
          Saved ({bookmarkIds.length})
        </button>
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            filter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          All ({items.length})
        </button>
      </div>

      {itemsLoading ? (
        <div className="relative mx-auto grid h-[calc(100dvh-8rem)] w-full max-w-7xl grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 px-4 py-3 lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[250px_minmax(380px,570px)_minmax(280px,360px)] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-x-6 lg:px-8">
          <div className="flex gap-1 lg:col-start-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="h-1 flex-1 animate-pulse rounded-full bg-muted" />
            ))}
          </div>
          <div className="hidden lg:block" />
          <div className="hidden rounded-[1.35rem] bg-brand-gradient opacity-80 lg:row-span-2 lg:block" />
          <div className="min-h-0 lg:col-start-2">
            <CardSkeleton />
          </div>
          <div className="hidden rounded-[1.35rem] border border-primary/10 bg-card/82 p-4 lg:block">
            <div className="space-y-3">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-20 animate-pulse rounded-2xl bg-muted" />
              <div className="h-28 animate-pulse rounded-2xl bg-muted" />
            </div>
          </div>
        </div>
      ) : filtered.length > 0 ? (
        <CardStack
          items={filtered}
          onActiveCard={handleActiveCard}
          bookmarkedIds={bookmarkIds}
          onBookmark={handleBookmark}
        />
      ) : (
        <div className="flex h-[calc(100dvh-12rem)] items-center justify-center px-4 text-center">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {filter === "saved" ? "No saved cards yet." : "No cards for this day yet."}
            </p>
            <p className="text-xs text-muted-foreground">
              {filter === "saved"
                ? "Tap the bookmark on any card to save it for revision."
                : "New cards appear here only after the pipeline runs and an admin publishes them."}
            </p>
          </div>
        </div>
      )}

      {/* Finished the deck → funnel into the quiz */}
      {onLastCard && !celebrate && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4">
          <Link
            href="/battle/queue?mode=daily"
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-saffron py-3 text-sm font-black text-ink shadow-lg shadow-saffron/25 transition-colors hover:bg-saffron/90"
          >
            <Swords className="h-4 w-4" />
            Done reading? Take today&apos;s quiz
          </Link>
        </div>
      )}

      {/* All 12 read → celebrate, then funnel into the quiz */}
      {celebrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-6 backdrop-blur-sm">
          {/* confetti dots */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="animate-float absolute h-2 w-2 rounded-full"
                style={{
                  left: `${(i * 37) % 100}%`,
                  top: `${(i * 53) % 100}%`,
                  background: i % 2 ? "#f9a01b" : "#283593",
                  animationDelay: `${(i % 5) * 0.3}s`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
          <div className="relative w-full max-w-sm rounded-[2rem] bg-card p-8 text-center shadow-2xl">
            <div className="animate-pulse-amber mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-saffron/18">
              <Flame className="animate-flame h-10 w-10 text-saffron" />
            </div>
            <p className="editorial-kicker mt-5 text-saffron">All 12 read</p>
            <h2 className="display-title mt-2 text-3xl">Today&apos;s reading is done</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {streak > 0 ? (
                <>You&apos;re on a <span className="font-black text-foreground">{streak}-day streak</span>. Lock it in with today&apos;s quiz.</>
              ) : (
                <>Now test yourself — 12 questions, exam scoring.</>
              )}
            </p>
            <Link
              href="/battle/queue?mode=daily"
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-saffron text-sm font-black text-ink shadow-sm shadow-saffron/25 transition hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" /> Take today&apos;s quiz <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setCelebrate(false)}
              className="mt-3 text-sm font-bold text-muted-foreground underline-offset-4 hover:underline"
            >
              Keep reading
            </button>
          </div>
        </div>
      )}
    </>
  );
}
