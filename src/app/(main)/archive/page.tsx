import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarDays, Bookmark } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { getContentGroupedByDate } from "@/lib/content/unified";
import { istDateLabel } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Archive — 12 Minutes Daily",
  description:
    "Every past day's 12 CLAT current-affairs cards, stored forever. Pick a day and revise.",
};

/**
 * The Archive — every past edition, never deleted.
 * Pick a day → read that day's cards in the News deck.
 */
export default async function ArchivePage() {
  const groups = await getContentGroupedByDate();

  return (
    <>
      <TopBar title="Archive" />
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="border-b border-border pb-6">
          <p className="editorial-kicker text-primary">Archive</p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Every day&apos;s news, saved forever.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
            Pick a day to re-read its cards. Old days never get deleted —
            revision is the whole point.
          </p>
        </div>

        <div className="divide-y divide-border">
          {groups.map(({ date, items }) => {
            const topics = [...new Set(items.flatMap((i) => i.topic_tags))].slice(0, 4);
            return (
              <Link
                key={date}
                href={`/shorts?day=${date}`}
                className="group grid gap-2 py-5 transition-colors hover:bg-muted/40 sm:grid-cols-[150px_1fr_auto] sm:items-center sm:px-2"
              >
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-base font-black tracking-tight">{istDateLabel(date)}</span>
                </span>
                <span className="min-w-0">
                  <span className="text-sm font-bold text-foreground">
                    {items.length} card{items.length === 1 ? "" : "s"}
                  </span>
                  <span className="ml-2 inline-flex flex-wrap gap-1.5 align-middle">
                    {topics.map((t) => {
                      return (
                        <span
                          key={t}
                          className="rounded-full border border-primary/10 bg-primary/10 px-2 py-0.5 text-[10px] font-bold capitalize text-primary"
                        >
                          {t}
                        </span>
                      );
                    })}
                  </span>
                </span>
                <span className="hidden items-center gap-1 text-sm font-black text-primary sm:flex">
                  Revise
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>

        <Link
          href="/shorts?day=saved"
          className="mt-6 flex items-center gap-3 rounded-2xl border border-saffron/40 bg-saffron-soft px-4 py-3.5 transition-all hover:-translate-y-0.5"
        >
          <Bookmark className="h-4 w-4 text-saffron" />
          <span className="flex-1 text-sm font-bold">Your saved cards</span>
          <ArrowRight className="h-4 w-4 text-saffron" />
        </Link>
      </main>
    </>
  );
}
