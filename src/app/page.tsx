import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MonitorPlay, Phone } from "lucide-react";
import { Crown } from "@/components/brand/crown";
import { Reveal, Stagger, StaggerItem } from "@/components/effects/reveal";
import { RitualPreview } from "@/components/landing/ritual-preview";
import { getBlogSource } from "@/lib/blog/source";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isMockMode } from "@/lib/content/config";

export default async function LandingPage() {
  const guides = (await getBlogSource().getAllPosts().catch(() => [])).slice(0, 3);
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE;
  const youtube = process.env.NEXT_PUBLIC_YOUTUBE_URL;

  let userEmail: string | null = null;
  try {
    if (isSupabaseConfigured() && !isMockMode()) {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      userEmail = data.user?.email ?? null;
    }
  } catch {}

  async function handleSignOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  return (
    <div className="min-h-dvh stitch-shell text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-saffron/20">
              <Crown size={27} animateTips />
            </span>
            <span className="text-sm font-bold text-foreground sm:text-base">
              <span className="sm:hidden">12 Minutes</span>
              <span className="hidden sm:inline">12 Minutes Daily</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              ["Today", "/today"],
              ["News", "/shorts"],
              ["Quiz", "/battle"],
              ["Archive", "/archive"],
              ["Guides", "/blog"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {phone && <a href={`tel:${phone.replace(/\s/g, "")}`} className="hidden text-sm font-bold text-muted-foreground hover:text-primary lg:inline-flex"><Phone className="mr-1.5 h-4 w-4" />{phone}</a>}
            {youtube && <a href={youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-saffron-soft hover:text-ink sm:inline-flex"><MonitorPlay className="h-4 w-4" /></a>}
            {userEmail ? (
              <>
                <Link href="/profile" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:inline-flex">Profile</Link>
                <form action={handleSignOut}>
                  <button type="submit" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:inline-flex">Log out</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:inline-flex">Sign in</Link>
            )}
            <Link href="/today" className="cta-pill h-10 px-4 text-sm sm:px-5">
              <span className="sm:hidden">{userEmail ? "Continue" : "Start"}</span>
              <span className="hidden sm:inline">{userEmail ? "Continue" : "Start today’s 12"}</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16">
          <div className="mx-auto max-w-6xl text-center">
            <Reveal>
              <p className="mx-auto inline-flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary">
                <span className="h-2 w-2 rounded-full bg-saffron" /> Daily exam habit
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="display-title mx-auto mt-5 max-w-3xl text-4xl leading-tight sm:text-5xl">
                Turn today&apos;s news into tomorrow&apos;s marks.
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Read 12 stories. Know why they matter. Take the quiz. Build your streak.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/today" className="cta-pill h-12 gap-2 px-7 text-sm">Start today&apos;s 12 <ArrowRight className="h-4 w-4" /></Link>
                <Link href="#demo" className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-white px-6 text-sm font-bold text-foreground transition hover:border-primary/30 hover:bg-primary/5">View demo</Link>
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
                <h2 className="display-title mt-2 text-3xl">Small loop. Visible progress.</h2>
                <p className="mt-3 max-w-md text-base leading-7 text-muted-foreground">The product is intentionally simple: read today&apos;s 12, learn the exam angle, answer 12 questions, revise what went wrong.</p>
              </div>
              <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.06}>
                {[
                  ["01", "Read", "12 concise cards from important current affairs."],
                  ["02", "Learn", "A study note explains the exam angle."],
                  ["03", "Quiz", "+1, -0.25, 0 scoring with review."],
                  ["04", "Repeat", "Streaks, saved cards and weak topics guide tomorrow."],
                ].map(([step, title, copy]) => (
                  <StaggerItem key={title} className="stitch-card rounded-lg p-5">
                    <span className="text-sm font-bold text-primary">{step}</span>
                    <h3 className="mt-5 text-xl font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
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
                  <h2 className="display-title mt-2 text-3xl">Exam strategy, minus the noise.</h2>
                </div>
                <Link href="/blog" className="hidden rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 sm:inline-flex">All guides</Link>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {guides.map((post, index) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="stitch-card group rounded-lg p-5 transition hover:border-primary/25 hover:shadow-md">
                    <span className="text-xs font-bold text-primary">0{index + 1}</span>
                    <p className="mt-6 text-xs font-semibold text-muted-foreground">{post.category}</p>
                    <h3 className="mt-2 text-lg font-bold leading-snug">{post.title}</h3>
                    <ArrowRight className="mt-6 h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <footer className="border-t border-border/70 px-4 py-6 text-center text-xs text-muted-foreground">
        <Link href="/privacy" className="font-semibold hover:text-foreground hover:underline">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
