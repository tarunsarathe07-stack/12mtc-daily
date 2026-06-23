"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Swords } from "lucide-react";
import { ShortCard } from "./short-card";
import type { ContentItem } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface CardStackProps {
  items: ContentItem[];
  onActiveCard?: (item: ContentItem, index: number) => void;
  bookmarkedIds?: string[];
  onBookmark?: (item: ContentItem) => void;
}

const SWIPE_THRESHOLD = 50;

export function CardStack({ items, onActiveCard, bookmarkedIds, onBookmark }: CardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => { setCurrentIndex(0); setDirection(0); }, [items]);
  useEffect(() => {
    const item = items[Math.min(currentIndex, items.length - 1)];
    if (item) onActiveCard?.(item, Math.min(currentIndex, items.length - 1));
  }, [currentIndex, items, onActiveCard]);

  const goNext = useCallback(() => {
    if (currentIndex < items.length - 1) { setDirection(1); setCurrentIndex((i) => i + 1); }
  }, [currentIndex, items.length]);
  const goPrev = useCallback(() => {
    if (currentIndex > 0) { setDirection(-1); setCurrentIndex((i) => i - 1); }
  }, [currentIndex]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (["ArrowDown", "ArrowRight", " "].includes(e.key)) { e.preventDefault(); goNext(); }
      if (["ArrowUp", "ArrowLeft"].includes(e.key)) { e.preventDefault(); goPrev(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y < -SWIPE_THRESHOLD || info.offset.x < -SWIPE_THRESHOLD) goNext();
    if (info.offset.y > SWIPE_THRESHOLD || info.offset.x > SWIPE_THRESHOLD) goPrev();
  }

  if (items.length === 0) {
    return <div className="flex h-[calc(100dvh-8rem)] items-center justify-center px-4 text-muted-foreground">No cards available yet.</div>;
  }

  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;

  return (
    <div className="relative mx-auto grid min-h-[calc(100dvh-6rem)] w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] px-4 py-3 sm:px-6 lg:px-8">
      <header className="mx-auto mb-4 flex w-full max-w-3xl items-center justify-between">
        <div className="w-28" />
        <div className="min-w-[160px] text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Daily shorts</p>
          <div className="mx-auto mt-1 h-1 w-24 overflow-hidden rounded-full bg-primary/10"><div className="h-full rounded-full bg-saffron transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="mt-1 text-[10px] font-black text-[#8a5200]">{currentIndex + 1}/{items.length}</p>
        </div>
        <button onClick={onBookmark ? () => onBookmark(currentItem) : undefined} aria-label="Bookmark current card" className="rounded-full p-2 text-foreground transition hover:bg-white">
          <Bookmark className={cn("h-5 w-5", bookmarkedIds?.includes(currentItem.id) && "fill-current text-primary")} />
        </button>
      </header>

      <div className="relative mx-auto min-h-0 w-full max-w-[690px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentItem.id}
            custom={direction}
            initial={{ x: direction > 0 ? 80 : -80, opacity: 0, scale: 0.985 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: direction > 0 ? -80 : 80, opacity: 0, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            drag
            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.01, rotate: 0.35 }}
            className="h-full min-h-[calc(100dvh-13.5rem)] cursor-grab active:cursor-grabbing"
          >
            <ShortCard item={currentItem} className="h-full" bookmarked={bookmarkedIds?.includes(currentItem.id)} onBookmark={onBookmark ? () => onBookmark(currentItem) : undefined} />
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="mx-auto mt-5 flex w-full max-w-[690px] items-center justify-between gap-3 pb-3">
        <button onClick={goPrev} disabled={currentIndex === 0} className="stitch-pill inline-flex h-12 w-12 items-center justify-center text-primary disabled:opacity-35" aria-label="Previous card"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={goNext} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-black text-white shadow-xl shadow-primary/20 transition hover:-translate-y-0.5">
          <CheckCircle2 className="h-4 w-4" /> Got it, next
        </button>
        {currentIndex === items.length - 1 ? (
          <Link href="/battle/queue?mode=daily" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-saffron px-5 text-sm font-black text-ink shadow-xl shadow-saffron/20 transition hover:-translate-y-0.5"><Swords className="h-4 w-4" /> Quiz</Link>
        ) : (
          <button onClick={goNext} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-saffron px-5 text-sm font-black text-ink shadow-xl shadow-saffron/20 transition hover:-translate-y-0.5">Read next <ChevronRight className="h-4 w-4" /></button>
        )}
      </footer>
    </div>
  );
}
