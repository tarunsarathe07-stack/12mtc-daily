"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Flame, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/today");
      router.refresh();
    }
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main className="grid min-h-dvh stitch-shell lg:grid-cols-2">
      {/* Brand panel — desktop only */}
      <aside className="ink-panel relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="brand-pattern pointer-events-none absolute inset-0 opacity-[0.18]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-black text-white ring-1 ring-white/20">
            12
          </div>
          <span className="text-sm font-black uppercase tracking-[0.2em] text-white/70">12 Minutes to CLAT</span>
        </div>
        <div className="relative">
          <h2 className="display-title text-4xl leading-tight text-white">
            12 minutes a day is all your current affairs need.
          </h2>
          <ul className="mt-8 space-y-4 text-sm text-white/80">
            <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-saffron" /> Source-backed cards from PIB, The Hindu, LiveLaw and more</li>
            <li className="flex items-center gap-3"><ArrowRight className="h-5 w-5 text-saffron" /> 12 cards, 12 questions, one daily quiz</li>
            <li className="flex items-center gap-3"><Flame className="h-5 w-5 text-saffron" /> A streak that keeps you coming back</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/50">Exam scoring built in: +1 right, −0.25 wrong, 0 skipped.</p>
      </aside>

      {/* Form */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 text-center lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground">
              12
            </div>
            <h1 className="display-title mt-2 text-2xl">12 Minutes Daily</h1>
            <p className="text-sm text-muted-foreground">CLAT current affairs in 12 minutes a day.</p>
          </div>

          <div className="hidden lg:block">
            <p className="editorial-kicker text-saffron">Welcome back</p>
            <h1 className="display-title mt-2 text-3xl">Sign in to keep your streak</h1>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-coral/30 bg-coral-soft px-3 py-2 text-sm font-medium text-foreground">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-saffron text-sm font-black text-ink shadow-sm shadow-saffron/25 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 font-semibold tracking-wider text-muted-foreground">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-bold text-foreground transition hover:bg-muted"
          >
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-bold text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
