import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Swords,
  CalendarDays,
  ShieldCheck,
  Target,
  Network,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getContentBySlug,
  getQuestionsForContent,
  getContentDate,
  getContentForDate,
} from "@/lib/content/unified";
import { Markdown } from "@/components/content/markdown";
import { istDateLabel, istToday } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getContentBySlug(slug);
  if (!item) return { title: "Study note" };
  return {
    title: item.title,
    description: item.summary,
    openGraph: {
      type: "article",
      title: item.title,
      description: item.summary,
      ...(item.image_url ? { images: [item.image_url] } : {}),
    },
  };
}

/** Pull "important terms" from the body's bold spans — honest extraction,
 *  no invented facts. */
function extractKeyTerms(body: string | null): string[] {
  if (!body) return [];
  const terms = new Set<string>();
  for (const match of body.matchAll(/\*\*([^*]{3,48})\*\*/g)) {
    const t = match[1].trim();
    if (t && !/^\d+$/.test(t)) terms.add(t);
    if (terms.size >= 8) break;
  }
  return [...terms];
}

/**
 * Current-affairs explainer — a premium study note, not a wall of text.
 * Structure: trust strip → why it matters → body → issue map → exam angle
 * → sources → quiz CTA, with a sticky next-action bar.
 */
export default async function DailyExplainerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getContentBySlug(slug);

  if (!item) {
    notFound();
  }

  const questions = await getQuestionsForContent(item.id);
  const date = getContentDate(item);
  const keyTerms = extractKeyTerms(item.body);

  // "Read next" — next slot in the same day's edition
  const dayItems = await getContentForDate(date);
  const pos = dayItems.findIndex((i) => i.id === item.id);
  const nextItem = pos >= 0 && pos + 1 < dayItems.length ? dayItems[pos + 1] : null;

  const sourceName =
    item.citations?.[0]?.source ??
    (() => {
      try {
        return new URL(item.source_urls[0]).hostname.replace("www.", "");
      } catch {
        return "Curated";
      }
    })();

  return (
    <div className="min-h-dvh pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/shorts"
            className="rounded-full p-1.5 hover:bg-muted transition-colors"
            aria-label="Back to shorts"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="flex-1 truncate text-sm font-medium">{item.title}</span>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        {/* Meta + title */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <CalendarDays className="h-3 w-3" />
              {istDateLabel(date)}
              {item.daily_slot ? ` · #${item.daily_slot} of 12` : ""}
            </span>
            {item.topic_tags.map((tag) => {
              return (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="border border-primary/10 bg-primary/10 text-xs capitalize text-primary"
                >
                  {tag}
                </Badge>
              );
            })}
          </div>
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight lg:text-4xl">
            {item.title}
          </h1>

          {/* Source trust strip */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {item.is_demo ? "Demo content" : "Human-reviewed"}
            </span>
            <span aria-hidden>·</span>
            <span>
              Source: <span className="font-medium text-foreground">{sourceName}</span>
            </span>
            <span aria-hidden>·</span>
            <span>
              {new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            {!item.is_demo && date === istToday() && (
              <>
                <span aria-hidden>·</span>
                <span className="font-semibold text-primary">Generated today</span>
              </>
            )}
          </div>
        </div>

        {/* The brief — the 60-second version, before the full note */}
        <section className="border-l-2 border-primary pl-4">
          <p className="editorial-kicker text-primary">Quick summary</p>
          <p className="mt-2 text-base leading-relaxed text-foreground/90 lg:text-lg">
            {item.summary}
          </p>
        </section>

        {/* Why it matters for CLAT */}
        {item.why_it_matters && (
          <Card className="border-saffron/35 bg-saffron-soft">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#8a5200] mb-1">
                Why it matters for CLAT
              </p>
              <p className="text-sm text-[#8a5200] leading-relaxed">{item.why_it_matters}</p>
            </CardContent>
          </Card>
        )}

        {/* Body (already sectioned: Background / Key Facts / Relevance / Takeaways) */}
        {item.body ? (
          <Markdown body={item.body} />
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            The full study note for this item is coming soon — the brief above
            covers the testable core.
          </p>
        )}

        <Separator />

        {/* Issue map — topic + the terms this story hangs on */}
        {keyTerms.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Network className="h-4 w-4 text-primary" />
              Key terms to remember
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-primary px-2.5 py-1 text-xs font-bold capitalize text-primary-foreground">
                {item.topic_tags[0]}
              </span>
              <span className="text-muted-foreground" aria-hidden>
                →
              </span>
              {keyTerms.map((term) => (
                <span
                  key={term}
                  className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-medium"
                >
                  {term}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* How CLAT may ask this */}
        {item.why_it_matters && (
          <section className="border-saffron/40 bg-saffron-soft/50 rounded-2xl border p-5">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Target className="h-4 w-4 text-saffron" />
              How CLAT may ask this
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Expect a ~450-word passage on this {item.topic_tags[0]} development with 5-6 MCQs.{" "}
              {item.why_it_matters} Difficulty band:{" "}
              <span className="font-semibold capitalize text-foreground">{item.difficulty}</span>.
            </p>
          </section>
        )}

        {/* Sources — names only, no external links (retention) */}
        {item.source_urls.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold mb-2">Citations</h3>
            <div className="flex flex-wrap gap-2">
              {(item.citations?.length
                ? item.citations.map((c) => c.source)
                : item.source_urls.map((url) => {
                    try {
                      return new URL(url).hostname.replace("www.", "");
                    } catch {
                      return "Source";
                    }
                  })
              ).map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                >
                  {name}
                </span>
              ))}
            </div>
          </section>
        )}
      </article>

      {/* Sticky next action — never a dead end */}
      <div className="fixed inset-x-0 bottom-20 z-30 px-4 lg:bottom-6">
        <div className="mx-auto flex w-full max-w-xl gap-2">
          <Link
            href={
              questions.length > 0
                ? `/battle/queue?mode=topic&topic=${item.topic_tags[0]}`
                : "/battle"
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-saffron py-3 text-sm font-black text-ink shadow-lg shadow-saffron/25 transition-colors hover:bg-saffron/90"
          >
            <Swords className="h-4 w-4" />
            Start quiz
          </Link>
          {nextItem ? (
            <Link
              href={`/daily/${nextItem.slug}`}
              className="flex flex-1 items-center justify-center gap-1.5 truncate rounded-xl border-2 border-border bg-card py-3 text-sm font-bold shadow-lg transition-colors hover:bg-muted"
            >
              <span className="truncate">
                Next: {nextItem.daily_slot ? `#${nextItem.daily_slot}` : "card"}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          ) : (
            <Link
              href="/shorts"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-border bg-card py-3 text-sm font-bold shadow-lg transition-colors hover:bg-muted"
            >
              Back to deck
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
