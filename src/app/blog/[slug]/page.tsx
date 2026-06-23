import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getBlogSource } from "@/lib/blog/source";
import { getContentBySlug } from "@/lib/content/unified";
import { Markdown } from "@/components/content/markdown";
import { ConversionCta } from "@/components/blog/conversion-cta";
import { FunnelLink } from "@/components/funnel/funnel-link";
import { tmcLink, CTA_LABELS } from "@/lib/funnel/links";

export const dynamic = "force-dynamic";

/**
 * Funnel blog article — 12 Minutes to CLAT marketing content ONLY.
 * Old current-affairs links that used /blog/[slug] are redirected to
 * /daily/[slug] so nothing 404s, but the two systems never mix.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogSource().getPostBySlug(slug);
  if (!post) return { title: "Blog — 12 Minutes to CLAT" };
  return {
    title: `${post.title} — 12 Minutes to CLAT`,
    description: post.excerpt,
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogSource().getPostBySlug(slug);

  if (!post) {
    // Legacy current-affairs link? Redirect to its new home.
    const caItem = await getContentBySlug(slug);
    if (caItem) {
      redirect(`/daily/${slug}`);
    }
    notFound();
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/blog"
            className="rounded-full p-1.5 hover:bg-muted transition-colors"
            aria-label="Back to blog"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-foreground">
              12
            </span>
            <span className="text-sm font-bold">Minutes to CLAT</span>
          </div>
          <Link
            href="/today"
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Open App
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
        {/* Title block */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{post.category}</Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(post.published_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight lg:text-4xl">
            {post.title}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">{post.excerpt}</p>
          <p className="text-sm text-muted-foreground">By {post.author}</p>
        </div>

        <Separator />

        {/* Body */}
        <Markdown body={post.body} />

        <Separator />

        {/* Conversion CTA */}
        <ConversionCta cta={post.cta} />

        <div className="pb-20 text-center">
          <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
            ← All articles
          </Link>
        </div>
      </article>

      {/* Sticky conversion bar — the Press always closes */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="hidden text-sm text-muted-foreground sm:block">
            Ready to make this a daily habit?
          </p>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link
              href="/today"
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-center text-sm font-bold transition-colors hover:bg-muted sm:flex-none"
            >
              Try today&apos;s 12
            </Link>
            <FunnelLink
              href={tmcLink("blog-sticky", "join")}
              label={CTA_LABELS.join}
              eventType="blog_cta_click"
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 sm:flex-none"
            >
              Join 12 Minutes to CLAT
            </FunnelLink>
          </div>
        </div>
      </div>
    </div>
  );
}
