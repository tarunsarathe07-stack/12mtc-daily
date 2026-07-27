"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Bookmark, CalendarDays, Check, ChevronDown, ChevronRight, Share2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { stripMarkdown } from "@/lib/utils/text";
import type { ContentItem } from "@/lib/types/database";
import { TopicArt } from "@/components/cards/topic-art";

interface ShortCardProps {
  item: ContentItem;
  className?: string;
  bookmarked?: boolean;
  onBookmark?: () => void;
}

export function ShortCard({ item, className, bookmarked, onBookmark }: ShortCardProps) {
  const [shared, setShared] = useState(false);
  const sourceName = (() => {
    const cited = item.citations?.[0]?.source;
    if (cited) return cited;
    try { return new URL(item.source_urls[0]).hostname.replace("www.", ""); } catch { return "Curated"; }
  })();
  const displayDate = new Date(`${item.content_date ?? (item.published_at ?? item.created_at).slice(0, 10)}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const primaryTopic = item.topic_tags[0] ?? "current affairs";
  const bodyPreview: string[] = item.body
    ? item.body
        .split(/\n\s*\n/)
        .map((p) => stripMarkdown(p))
        .filter(Boolean)
        .slice(0, 2)
    : [];

  async function shareCard() {
    const url = `${window.location.origin}/daily/${item.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: item.summary, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      // The native share sheet may be dismissed without completing.
    }
  }

  return (
    <article className={cn("stitch-card-strong flex h-full flex-col overflow-hidden rounded-lg bg-white", className)}>
      <div className="stitch-image-mask relative h-[18dvh] min-h-[130px] max-h-[190px] shrink-0 bg-primary/8">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, 690px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <TopicArt topic={primaryTopic} slot={item.daily_slot} className="h-full rounded-none" />
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <Badge className="rounded-md border border-border bg-white px-2.5 py-1 text-xs font-semibold capitalize text-primary shadow-sm">
            {primaryTopic.replace(/-/g, " ")}
          </Badge>
          <button onClick={onBookmark} aria-label={bookmarked ? "Remove bookmark" : "Bookmark"} className={cn("rounded-lg border border-border bg-white p-2.5 text-primary shadow-sm transition hover:bg-primary/5", bookmarked && "border-primary bg-primary text-white")}>
            <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="text-primary">{sourceName}</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-saffron" />{displayDate}</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-primary" />{item.is_demo ? "Demo" : "Reviewed"}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-5 [scrollbar-width:thin]">
          <h2 className="text-xl font-bold leading-snug sm:text-2xl">
            {item.title}
          </h2>

          <div className="mt-4 rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3.5 text-[15px] font-medium leading-7 text-foreground/85">
            {stripMarkdown(item.summary)}
          </div>

          {bodyPreview.length > 0 ? (
            <div className="mt-5 space-y-4 text-[15px] leading-7 text-foreground/82">
              {bodyPreview.map((paragraph: string, index: number) => (
                <p key={index}>{paragraph.slice(0, 320)}{paragraph.length > 320 ? "..." : ""}</p>
              ))}
            </div>
          ) : null}

          {item.why_it_matters && (
            <details className="group mt-5 rounded-lg border border-border bg-muted/35 px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold text-primary marker:hidden">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-saffron" />Why this matters for CLAT</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.why_it_matters}</p>
            </details>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/70 pt-4">
          <span className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{item.daily_slot ?? "1"}/12</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={shareCard}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={shared ? "Link copied" : "Share this card"}
              title={shared ? "Link copied" : "Share"}
            >
              {shared ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
            </button>
            <Link href={`/daily/${item.slug}`} className="brand-secondary gap-1 px-4 py-2 text-xs">
              Full context <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
