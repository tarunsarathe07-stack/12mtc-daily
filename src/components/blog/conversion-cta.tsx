"use client";

/**
 * Conversion CTAs for funnel blog posts — students → 12 Minutes to CLAT customers.
 * Honest copy only: no fake stats, no fake testimonials.
 * Primary CTA varies per post; counselling + prep-plan are always offered.
 * Brand CTAs go OUT to 12minutestoclat.com with UTM params; every click
 * is recorded as a blog_cta_click conversion event.
 */

import { ArrowRight, Flame, Swords, BookOpen, Phone, GraduationCap } from "lucide-react";
import type { BlogPost } from "@/lib/types/database";
import { FunnelLink } from "@/components/funnel/funnel-link";
import { tmcLink, CTA_LABELS } from "@/lib/funnel/links";

const CTA_CONTENT: Record<
  BlogPost["cta"],
  { heading: string; sub: string; button: string; href: string; icon: React.ReactNode }
> = {
  "start-daily": {
    heading: "Start 12 Minutes Daily",
    sub: "12 curated current-affairs cards and a 12-question quiz, every single day. Free to start — no signup needed to read.",
    button: "Start today's 12",
    href: "/today",
    icon: <BookOpen className="h-5 w-5" />,
  },
  "join-12mtc": {
    heading: CTA_LABELS.join,
    sub: "Daily current affairs, CLAT-style quizzes, streaks, and a rating that tracks your real progress — built only for CLAT UG.",
    button: "Join 12 Minutes to CLAT",
    href: tmcLink("blog-join"),
    icon: <ArrowRight className="h-5 w-5" />,
  },
  "save-streak": {
    heading: CTA_LABELS.saveStreak,
    sub: "Create a free account so your streak, XP, and rating survive — consistency is the whole strategy.",
    button: "Create free account",
    href: "/signup",
    icon: <Flame className="h-5 w-5" />,
  },
  "prepare-12mtc": {
    heading: "Prepare with 12 Minutes to CLAT",
    sub: "Every quiz here uses real CLAT scoring (+1 / −0.25), so exam discipline becomes a daily habit, not a last-week scramble.",
    button: "Try a 12-question battle",
    href: "/battle",
    icon: <Swords className="h-5 w-5" />,
  },
};

export function ConversionCta({ cta }: { cta: BlogPost["cta"] }) {
  const c = CTA_CONTENT[cta];

  return (
    <div className="space-y-3">
      {/* Primary CTA */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span className="bg-brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white shadow-md">
            12
          </span>
          <div className="flex-1">
            <p className="text-lg font-bold">{c.heading}</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{c.sub}</p>
          </div>
          <FunnelLink
            href={c.href}
            label={c.heading}
            eventType="blog_cta_click"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-saffron px-5 py-2.5 text-sm font-black text-ink shadow-lg shadow-saffron/25 transition-all hover:-translate-y-0.5 hover:bg-saffron/90"
          >
            {c.icon}
            {c.button}
          </FunnelLink>
        </div>
      </div>

      {/* Always-on funnel row */}
      <div className="grid gap-3 sm:grid-cols-2">
        <FunnelLink
          href={tmcLink("blog-counselling", "counselling-call")}
          label={CTA_LABELS.counselling}
          eventType="blog_cta_click"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Phone className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">{CTA_LABELS.counselling}</span>
        </FunnelLink>
        <FunnelLink
          href={tmcLink("blog-prep-plan", "prep-plan")}
          label={CTA_LABELS.prepPlan}
          eventType="blog_cta_click"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <GraduationCap className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">{CTA_LABELS.prepPlan}</span>
        </FunnelLink>
      </div>
    </div>
  );
}
