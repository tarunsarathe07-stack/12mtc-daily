"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Bookmark, CalendarDays, ChevronDown, ChevronRight, Share2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentItem } from "@/lib/types/database";
import { TopicArt } from "@/components/cards/topic-art";

interface ShortCardProps {
  item: ContentItem;
  className?: string;
  bookmarked?: boolean;
  onBookmark?: () => void;
}

export function ShortCard({ item, className, bookmarked, onBookmark }: ShortCardProps) {
  const sourceName = (() => {
    const cited = item.citations?.[0]?.source;
    if (cited) return cited;
    try { return new URL(item.source_urls[0]).hostname.replace("www.", ""); } catch { return "Curated"; }
  })();
  const displayDate = new Date(`${item.content_date ?? (item.published_at ?? item.created_at).slice(0, 10)}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const primaryTopic = item.topic_tags[0] ?? "current affairs";
  const bodyPreview: string[] = item.body
    ? item.body.split(/\n\s*\n/).filter(Boolean).slice(0, 2)
    : [];

  return (
    <article className={cn("stitch-card-strong flex h-full flex-col overflow-hidden rounded-[2.1rem] bg-white", className)}>
      <div className="stitch-image-mask relative h-[30dvh] min-h-[210px] max-h-[330px] shrink-0 bg-primary/8">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <TopicArt topic={primaryTopic} slot={item.daily_slot} className="h-full rounded-none" />
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <Badge className="rounded-full border-0 bg-white/92 px-3 py-1 text-[11px] font-black capitalize text-primary shadow-sm backdrop-blur">
            {primaryTopic.replace(/-/g, " ")}
          </Badge>
          <button onClick={onBookmark} aria-label={bookmarked ? "Remove bookmark" : "Bookmark"} className={cn("rounded-full bg-white/92 p-2.5 text-primary shadow-sm backdrop-blur transition hover:scale-105", bookmarked && "bg-saffron text-ink")}>
            <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.13em] text-muted-foreground">
          <span className="text-primary">{sourceName}</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-saffron" />{displayDate}</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-primary" />{item.is_demo ? "Demo" : "Reviewed"}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-5 [scrollbar-width:thin]">
          <h2 className="display-title text-[2rem] leading-[1.02] sm:text-[2.45rem]">
            {item.title}
          </h2>

          <div className="mt-5 rounded-[1.45rem] border-l-4 border-saffron bg-[#f5f2fb] px-4 py-4 text-[15px] font-medium leading-7 text-foreground/82">
            {item.summary}
          </div>

          {bodyPreview.length > 0 ? (
            <div className="mt-5 space-y-4 text-[15px] leading-7 text-foreground/82">
              {bodyPreview.map((paragraph: string, index: number) => (
                <p key={index}>{paragraph.slice(0, 320)}{paragraph.length > 320 ? "..." : ""}</p>
              ))}
            </div>
          ) : null}

          {item.why_it_matters && (
            <details className="group mt-5 rounded-full border border-primary/10 bg-[#fbf9ff] px-4 py-3 open:rounded-[1.35rem]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black text-primary marker:hidden">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-saffron" />Why this matters for CLAT</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.why_it_matters}</p>
            </details>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/70 pt-4">
          <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-black text-white">{item.daily_slot ?? "1"}/12</span>
          <div className="flex items-center gap-2">
            <button className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Share"><Share2 className="h-4 w-4" /></button>
            <Link href={`/daily/${item.slug}`} className="inline-flex items-center gap-1 rounded-full bg-saffron px-4 py-2 text-xs font-black text-ink shadow-sm shadow-saffron/20 transition hover:-translate-y-0.5">
              Study note <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
