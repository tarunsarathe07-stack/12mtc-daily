"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bot,
  User,
  Swords,
  TrendingUp,
  TrendingDown,
  Zap,
  Flame,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ConfettiBurst } from "@/components/effects/confetti-burst";
import { CountUp } from "@/components/effects/count-up";
import { FunnelLink } from "@/components/funnel/funnel-link";
import { tmcLink, CTA_LABELS } from "@/lib/funnel/links";
import type { BattleResultSummary } from "@/lib/types/database";

/**
 * Battle results — everything here was computed SERVER-SIDE by
 * /api/battle/complete (scores, ELO, XP, streak, mastery). This page
 * only renders the summary and drives the conversion funnel.
 */

function logEvent(eventType: string, ctaLabel?: string, meta?: Record<string, unknown>) {
  fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType, ctaLabel, meta, path: window.location.pathname }),
  }).catch(() => {});
}

export default function BattleResultsPage() {
  const params = useParams();
  const sessionId = params.roomId as string;
  const [data, setData] = useState<BattleResultSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPersistedResult() {
      try {
        const response = await fetch(`/api/battle/result/${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        const summary = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(summary?.error || "This result could not be loaded.");
          return;
        }
        const parsed = summary as BattleResultSummary;
        setData(parsed);
        sessionStorage.setItem(`tmd-result-${sessionId}`, JSON.stringify(parsed));
        if (parsed.weakTopics.length > 0) {
          logEvent("weak_topic_shown", undefined, {
            topics: parsed.weakTopics.map((topic) => topic.topic),
          });
        }
      } catch {
        if (cancelled) return;
        const cached = sessionStorage.getItem(`tmd-result-${sessionId}`);
        if (cached) {
          try {
            setData(JSON.parse(cached) as BattleResultSummary);
            return;
          } catch {
            sessionStorage.removeItem(`tmd-result-${sessionId}`);
          }
        }
        setLoadError("The result service could not be reached.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPersistedResult();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const ringDash = useMemo(() => {
    const pct = data?.accuracy ?? 0;
    const r = 34;
    const c = 2 * Math.PI * r;
    return { c, filled: (pct / 100) * c };
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="animate-pulse text-sm font-semibold text-muted-foreground" role="status">
          Loading your result…
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-muted-foreground">
          {loadError || "Battle results not found."}
        </p>
        <Link href="/battle" className="text-sm font-medium text-primary hover:underline">
          Go to Battle Lobby
        </Link>
      </div>
    );
  }

  const grade =
    data.accuracy >= 90 ? "S" : data.accuracy >= 75 ? "A" : data.accuracy >= 60 ? "B" : data.accuracy >= 40 ? "C" : "D";
  return (
    <div className="bg-mesh min-h-dvh">
      {data.won && <ConfettiBurst />}
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Stitch-style analytics summary ── */}
        <section className="space-y-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="editorial-kicker text-primary">Today&apos;s result</p>
              <h1 className="display-title mt-2 text-4xl sm:text-5xl">{data.won ? "You won the round." : data.draw ? "You matched the round." : "Close round. Clear fixes."}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Review your score, protect your streak, then revise the weakest topic before tomorrow&apos;s 12.</p>
            </div>
            <div className="stitch-pill inline-flex items-center gap-3 px-4 py-3">
              <Flame className="h-5 w-5 text-saffron" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Current streak</p>
                <p className="text-xl font-black text-saffron">{data.streak} days</p>
              </div>
            </div>
          </div>

          <ScoreSummary data={data} grade={grade} ringDash={ringDash} />

          <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="stitch-card rounded-[1.8rem] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-primary">Question outcome</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Every answer from this 12-question round</p>
                </div>
                <p className="text-4xl font-black tabular-nums text-saffron">{data.accuracy}%</p>
              </div>
              <div className="mt-8 grid grid-cols-6 gap-2 sm:grid-cols-12">
                {data.review.map((answer) => (
                  <span
                    key={answer.index}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg text-xs font-black text-white",
                      answer.playerCorrect
                        ? "bg-primary"
                        : answer.playerOption
                        ? "bg-coral"
                        : "bg-muted-foreground"
                    )}
                    aria-label={`Question ${answer.index + 1}: ${answer.playerCorrect ? "correct" : answer.playerOption ? "wrong" : "skipped"}`}
                  >
                    {answer.index + 1}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground">
                <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-primary" />Correct</span>
                <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-coral" />Wrong</span>
                <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground" />Skipped</span>
              </div>
            </div>

            <div className="stitch-card rounded-[1.8rem] p-5 sm:p-6">
              <h2 className="text-xl font-black text-primary">Current streak</h2>
              <p className="mt-1 text-sm text-muted-foreground">Qualified daily practice days</p>
              <p className="mt-6 text-5xl font-black tabular-nums text-saffron">{data.streak}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">days in your current run</p>
              <div className="mt-7 grid grid-cols-7 gap-2">
                {Array.from({ length: 14 }).map((_, index) => (
                  <span
                    key={index}
                    className="aspect-square rounded-[0.7rem] bg-saffron"
                    style={{ opacity: index < Math.min(14, data.streak) ? 0.95 : 0.14 }}
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          </div>

          {data.weakTopics.length > 0 && (
            <div className="stitch-card rounded-[1.8rem] p-5 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[0.55fr_1fr] lg:items-center">
                <div>
                  <h2 className="text-xl font-black text-primary">Topic mastery</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Your lowest topics are not a failure signal. They are tomorrow&apos;s fastest marks.</p>
                  <Link href={`/battle/queue?mode=topic&topic=${data.weakTopics[0].topic}`} className="mt-5 inline-flex rounded-full bg-saffron px-5 py-3 text-sm font-black text-ink shadow-lg shadow-saffron/20">Revise weak topic</Link>
                </div>
                <div className="space-y-4 rounded-[1.4rem] bg-white p-4 ring-1 ring-border/70">
                  {data.weakTopics.slice(0, 3).map((topic) => (
                    <div key={topic.topic}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm font-black">
                        <span className="capitalize">{topic.topic}</span>
                        <span className="tabular-nums text-primary">{topic.mastery_pct}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-primary/10">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, topic.mastery_pct)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Rating + XP movement ── */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="soft-card rounded-[1.35rem] border-0">
            <CardContent className="space-y-1 p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                {data.ratingChange >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-coral" />
                )}
                Rating
              </div>
              <p
                className={cn(
                  "text-2xl font-black tabular-nums",
                  data.ratingChange > 0 ? "text-primary" : data.ratingChange < 0 ? "text-coral" : ""
                )}
              >
                <CountUp value={data.ratingChange} prefix={data.ratingChange > 0 ? "+" : ""} />
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {data.ratingBefore} → {data.newRating}
              </p>
            </CardContent>
          </Card>
          <Card className="soft-card rounded-[1.35rem] border-0">
            <CardContent className="space-y-1 p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-saffron" />
                XP earned
              </div>
              <p className="text-2xl font-black tabular-nums text-saffron">
                <CountUp value={data.xpEarned} prefix="+" />
              </p>
              <p className="text-[11px] text-muted-foreground">
                <Flame className="mr-0.5 inline h-3 w-3 text-saffron" />
                {data.streak}-day streak
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Weak-topic insight → drill + counselling funnel ── */}
        {data.weakTopics.length > 0 && (
          <Card className="soft-card rounded-[1.5rem] border-0 bg-saffron-soft">
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-bold">What to revise next</p>
              <div className="flex flex-wrap gap-2">
                {data.weakTopics.map((t) => {
                  return (
                    <Link
                      key={t.topic}
                      href={`/battle/queue?mode=topic&topic=${t.topic}`}
                      className="rounded-full bg-white px-3 py-1 text-xs font-bold capitalize text-primary shadow-sm"
                    >
                      {t.topic} · {t.mastery_pct}%
                    </Link>
                  );
                })}
              </div>
              <Link
                href={`/battle/queue?mode=topic&topic=${data.weakTopics[0].topic}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 capitalize"
              >
                <Swords className="h-4 w-4" />
                Revise {data.weakTopics[0].topic} now
              </Link>
              <FunnelLink
                href={tmcLink("results-counselling", "counselling-call")}
                label={CTA_LABELS.counselling}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-saffron/40 bg-card py-2.5 text-sm font-semibold text-[#8a5200] transition-colors hover:bg-saffron-soft"
              >
                <Phone className="h-4 w-4" />
                {CTA_LABELS.counselling}
              </FunnelLink>
            </CardContent>
          </Card>
        )}

        {/* ── Review answers ── */}
        <button
          onClick={() => setShowReview(!showReview)}
          className="flex w-full items-center justify-between py-1"
        >
          <span className="text-sm font-bold">Check your answers</span>
          {showReview ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {showReview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {data.review.map((r) => (
              <Card key={r.index} className="soft-card rounded-2xl border-0">
                <CardContent className="space-y-1.5 p-3">
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white",
                        r.playerCorrect ? "bg-primary" : r.playerOption ? "bg-coral" : "bg-muted-foreground"
                      )}
                    >
                      {r.index + 1}
                    </span>
                    <p className="text-xs font-medium leading-relaxed">{r.prompt}</p>
                  </div>
                  <p className="ml-7 text-xs text-primary">
                    ✓ {r.correctOption}) {r.correctText}
                  </p>
                  <p className="ml-7 text-[11px] text-muted-foreground">
                    You: {r.playerOption ?? "skipped"} · Bot: {r.botOption}
                  </p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        <Separator />

        {/* ── CTAs ── */}
        <div className="space-y-3">
          <button
            onClick={async () => {
              const text = `I scored ${data.playerScore.toFixed(2)} (rank ${grade}, ${data.accuracy}% accuracy) in today's 12-question CLAT battle on 12 Minutes Daily. Can you beat me?`;
              try {
                if (navigator.share) {
                  await navigator.share({ title: "12 Minutes Daily", text });
                } else {
                  await navigator.clipboard.writeText(text);
                  alert("Result copied — paste it anywhere!");
                }
              } catch {
                // user dismissed share sheet
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
          >
            Share your rank {grade} result
          </button>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/battle/queue?mode=${data.mode}${data.topic ? `&topic=${data.topic}` : ""}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Swords className="h-4 w-4" />
              Rematch
            </Link>
            <Link
              href="/shorts"
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-border py-3 text-sm font-bold transition-colors hover:bg-muted"
            >
              <BookOpen className="h-4 w-4" />
              Read today&apos;s 12
            </Link>
          </div>

          {/* Conversion CTA — outbound with UTMs */}
          <FunnelLink
            href={tmcLink("results-join", "join")}
            label={CTA_LABELS.join}
            className="block rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="flex items-center gap-3">
              <span className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white">
                12
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold">{CTA_LABELS.join}</p>
                <p className="text-xs text-muted-foreground">
                  Full CLAT prep beyond current affairs — from the 12MTC team.
                </p>
              </div>
              <span className="text-sm font-bold text-primary">→</span>
            </div>
          </FunnelLink>

          <Link
            href="/blog"
            className="block text-center text-xs font-semibold text-primary hover:underline"
          >
            Read CLAT guides on the blog →
          </Link>
        </div>

        <div className="h-16" />
      </div>
    </div>
  );
}

function ScoreSummary({
  data,
  grade,
  ringDash,
}: {
  data: BattleResultSummary;
  grade: string;
  ringDash: { c: number; filled: number };
}) {
  return (
    <Card className="overflow-hidden border-primary/15 bg-white shadow-lg shadow-ink/5">
      <CardContent className="p-5 sm:p-6">
        <div className="grid items-center gap-5 sm:grid-cols-[5rem_1fr_6rem]">
          <div className="mx-auto flex h-20 w-20 flex-col items-center justify-center rounded-2xl bg-ink text-white sm:mx-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Rank</span>
            <span className="text-5xl font-black leading-none text-saffron">{grade}</span>
          </div>

          <div>
            <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground sm:text-left">
              {data.mode === "topic" && data.topic ? `${data.topic} duel` : "Daily battle"}
            </p>
            <div className="mt-2 flex items-center justify-center gap-4 sm:justify-start">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> You
                </div>
                <p className="text-4xl font-black tabular-nums text-primary">
                  <CountUp value={data.playerScore} decimals={2} duration={900} />
                </p>
              </div>
              <span className="text-sm font-black text-muted-foreground">vs</span>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Bot className="h-3.5 w-3.5" /> {data.botName}
                </div>
                <p className="text-4xl font-black tabular-nums">{data.botScore.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto h-24 w-24">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="40" cy="40" r="34" fill="none" strokeWidth="7" className="stroke-muted" />
              <motion.circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                strokeWidth="7"
                strokeLinecap="round"
                className="stroke-primary"
                strokeDasharray={ringDash.c}
                initial={{ strokeDashoffset: ringDash.c }}
                animate={{ strokeDashoffset: ringDash.c - ringDash.filled }}
                transition={{ duration: 0.8, delay: 0.15 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black tabular-nums">{data.accuracy}%</span>
              <span className="text-[9px] text-muted-foreground">accuracy</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 border-t border-border pt-4 text-center">
          <Stat label="Correct" value={`${data.correct}`} tone="text-primary" />
          <Stat label="Wrong" value={`${data.wrong}`} tone="text-coral" />
          <Stat label="Skipped" value={`${data.skipped}`} tone="text-muted-foreground" />
          <Stat label="Avg time" value={`${(data.playerAvgMs / 1000).toFixed(1)}s`} tone="text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <p className={cn("text-base font-black tabular-nums", tone)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
