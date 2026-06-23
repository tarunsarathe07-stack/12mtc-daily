import Link from "next/link";
import { ArrowRight, MonitorPlay, Phone } from "lucide-react";
import { Crown } from "@/components/brand/crown";
import { Reveal, Stagger, StaggerItem } from "@/components/effects/reveal";
import { RitualPreview } from "@/components/landing/ritual-preview";
import { getBlogSource } from "@/lib/blog/source";

export default async function LandingPage() {
  const guides = (await getBlogSource().getAllPosts().catch(() => [])).slice(0, 3);
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE;
  const youtube = process.env.NEXT_PUBLIC_YOUTUBE_URL;

  return (
    <div className="min-h-dvh stitch-shell text-foreground">
      <header className="sticky top-3 z-40 px-3 sm:px-5">
        <div className="stitch-nav mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-2xl px-3 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-saffron/18">
              <Crown size={27} animateTips />
            </span>
            <span className="text-base font-black tracking-tight text-primary">12 Minutes Daily</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              ["Today", "/today"],
              ["News", "/shorts"],
              ["Quiz", "/battle"],
              ["Archive", "/archive"],
              ["Guides", "/blog"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="rounded-full px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {phone && <a href={`tel:${phone.replace(/\s/g, "")}`} className="hidden text-sm font-bold text-muted-foreground hover:text-primary lg:inline-flex"><Phone className="mr-1.5 h-4 w-4" />{phone}</a>}
            {youtube && <a href={youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-saffron-soft hover:text-ink sm:inline-flex"><MonitorPlay className="h-4 w-4" /></a>}
            <Link href="/today" className="cta-pill h-10 px-5 text-sm">Start today&apos;s 12</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="px-4 pb-12 pt-14 sm:px-6 lg:px-8 lg:pb-16">
          <div className="mx-auto max-w-6xl text-center">
            <Reveal>
              <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-primary shadow-sm">
                <span className="h-2 w-2 rounded-full bg-saffron" /> Daily exam habit
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="display-title mx-auto mt-6 max-w-4xl text-[3.25rem] leading-[0.95] sm:text-7xl lg:text-[5.6rem]">
                Turn today&apos;s news into tomorrow&apos;s marks.
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Read 12 stories. Know why they matter. Take the quiz. Build your streak.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/today" className="cta-pill h-12 gap-2 px-7 text-sm">Start today&apos;s 12 <ArrowRight className="h-4 w-4" /></Link>
                <Link href="#demo" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-black text-primary shadow-sm ring-1 ring-primary/10 transition hover:-translate-y-0.5 hover:shadow-md">View demo</Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.24}>
            <div id="demo" className="mx-auto mt-12 max-w-6xl">
              <RitualPreview />
            </div>
          </Reveal>
        </section>

        <section id="how-it-works" className="border-y border-border/70 bg-white/42 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="editorial-kicker text-primary">Why students return</p>
                <h2 className="display-title mt-3 text-4xl sm:text-5xl">Small loop. Visible progress.</h2>
                <p className="mt-4 max-w-md text-base leading-8 text-muted-foreground">The product is intentionally simple: read today&apos;s 12, learn the exam angle, answer 12 questions, revise what went wrong.</p>
              </div>
              <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.06}>
                {[
                  ["01", "Read", "12 concise cards from important current affairs."],
                  ["02", "Learn", "A study note explains the exam angle."],
                  ["03", "Quiz", "+1, -0.25, 0 scoring with review."],
                  ["04", "Repeat", "Streaks, saved cards and weak topics guide tomorrow."],
                ].map(([step, title, copy]) => (
                  <StaggerItem key={title} className="stitch-card rounded-[1.75rem] p-5">
                    <span className="text-sm font-black text-saffron">{step}</span>
                    <h3 className="mt-7 text-2xl font-black tracking-tight">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy}</p>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>
        </section>

        {guides.length > 0 && (
          <section className="px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <p className="editorial-kicker text-primary">Guides</p>
                  <h2 className="display-title mt-2 text-4xl">Exam strategy, minus the noise.</h2>
                </div>
                <Link href="/blog" className="hidden rounded-full bg-white px-4 py-2 text-sm font-black text-primary shadow-sm hover:shadow-md sm:inline-flex">All guides</Link>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {guides.map((post, index) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="stitch-card group rounded-[1.75rem] p-5 transition hover:-translate-y-1 hover:shadow-xl">
                    <span className="text-xs font-black text-saffron">0{index + 1}</span>
                    <p className="mt-8 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">{post.category}</p>
                    <h3 className="mt-2 text-xl font-black leading-tight tracking-tight">{post.title}</h3>
                    <ArrowRight className="mt-6 h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
