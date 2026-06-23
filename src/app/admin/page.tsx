"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Play,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import type { TopicTag } from "@/lib/types/database";

const EDITION_TOPICS: TopicTag[] = [
  "legal",
  "polity",
  "international",
  "economy",
  "environment",
  "reports",
];

interface Stats {
  total: number;
  review: number;
  approved: number;
  published: number;
  rejected: number;
  draft: number;
}

interface PipelineResult {
  runId?: string;
  totalFetched?: number;
  relevant?: number;
  generated?: number;
  questions?: number;
  errors?: string[];
  error?: string;
}

interface DailyStatus {
  date: string;
  target: number;
  published: number;
  awaitingReview: number;
  approvedNotPublished: number;
  missingSlots: number[];
  overflow: number;
  approvedQuestionsToday: number;
  approvedQuestionsTotal: number;
  battleReady: boolean;
  questionFallbackActive: boolean;
  topicMix: Partial<Record<TopicTag, number>>;
  slots: Array<{
    slot: number;
    title: string;
    id: string;
    topicTags: TopicTag[];
    approvedQuestionCount: number;
  } | null>;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    review: 0,
    approved: 0,
    published: 0,
    rejected: 0,
    draft: 0,
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [daily, setDaily] = useState<DailyStatus | null>(null);

  const loadStats = async () => {
    try {
      const res = await fetch("/api/content/list", { cache: "no-store" });
      const data = await res.json();
      setStats(data.stats);
    } catch {
      // ignore — stats stay at 0
    }
    try {
      const res = await fetch("/api/content/daily-status", { cache: "no-store" });
      setDaily(await res.json());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const runPipeline = async (dryRun: boolean) => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/content/ingest?limit=12${dryRun ? "&dryRun=1" : ""}`,
        { method: "POST" }
      );
      const data = await res.json();
      setResult(data);
      if (!dryRun) loadStats();
    } catch (err) {
      setResult({ error: "Pipeline request failed" });
    } finally {
      setRunning(false);
    }
  };

  const statCards = [
    { label: "Pending Review", value: stats.review, icon: Clock, color: "text-amber-500" },
    { label: "Published", value: stats.published, icon: CheckCircle, color: "text-primary" },
    { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-red-500" },
    { label: "Total Items", value: stats.total, icon: FileText, color: "text-blue-500" },
  ];

  const missingTopicHints =
    daily && daily.published > 0
      ? EDITION_TOPICS.filter((topic) => !(daily.topicMix?.[topic] ?? 0))
      : [];

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Content pipeline and review management
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/content">
              <Button variant="outline" size="sm">
                Review Queue
              </Button>
            </Link>
            <Link href="/admin/pipeline">
              <Button variant="outline" size="sm">
                Pipeline Runs
              </Button>
            </Link>
            <Link href="/admin/funnel">
              <Button variant="outline" size="sm">
                Funnel
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6 space-y-6">
        {/* Today's edition: X/12 ready */}
        {daily && (
          <Card
            className={
              daily.published >= daily.target
                ? "border-primary/30 bg-primary/5"
                : "border-amber-300 bg-amber-50"
            }
          >
            <CardContent className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold">
                    Today&apos;s edition ({daily.date}):{" "}
                    <span className={daily.published >= daily.target ? "text-primary" : "text-amber-700"}>
                      {daily.published}/{daily.target} ready
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {daily.awaitingReview} awaiting review · {daily.approvedNotPublished} approved
                    (not yet published)
                    {daily.overflow > 0 && ` · ${daily.overflow} published beyond slot 12`}
                  </p>
                </div>
                <Link href="/admin/content">
                  <Button size="sm" variant="outline">
                    Fill missing slots
                  </Button>
                </Link>
              </div>

              {/* Slot grid 1-12 */}
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
                {daily.slots.map((slot, idx) => (
                  <div
                    key={idx}
                    title={
                      slot
                        ? `${slot.title} · ${slot.topicTags.join(", ")} · ${slot.approvedQuestionCount} approved questions`
                        : `Slot ${idx + 1} — empty`
                    }
                    className={`flex aspect-square flex-col items-center justify-center rounded-md text-xs font-bold ${
                      slot
                        ? "bg-primary text-white"
                        : "border border-dashed border-amber-400 bg-background text-amber-600"
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {slot && (
                      <span className="mt-0.5 text-[9px] font-black opacity-75">
                        {slot.approvedQuestionCount}Q
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border bg-background/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Topic mix
                  </p>
                  {missingTopicHints.length > 0 && (
                    <p className="text-xs text-amber-700">
                      Missing: {missingTopicHints.join(", ")}
                    </p>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EDITION_TOPICS.map((topic) => {
                    const count = daily.topicMix?.[topic] ?? 0;
                    return (
                      <span
                        key={topic}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                          count
                            ? "border-primary/20 bg-primary/5 text-primary"
                            : "border-dashed border-muted-foreground/25 text-muted-foreground"
                        }`}
                      >
                        {topic}: {count}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  Use this as an editorial guardrail, not a hard quota. If the day&apos;s news is genuinely
                  legal-heavy, publish it — but avoid letting court updates crowd out national, international,
                  economy, and policy stories every day.
                </p>
              </div>

              {/* Question readiness warning — admin-visible, never student-facing */}
              {(!daily.battleReady || daily.questionFallbackActive) && (
                <div className="flex items-start gap-2 rounded-lg bg-background/70 p-2.5 text-xs">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span className="text-muted-foreground">
                    {daily.battleReady ? (
                      <>
                        Only <strong>{daily.approvedQuestionsToday}</strong> approved questions from
                        today&apos;s items — the quiz can start, but it will top up from the approved
                        archive until today reaches 12.
                      </>
                    ) : (
                      <>
                        Battle is not ready: <strong>{daily.approvedQuestionsTotal}</strong>/
                        {daily.target} approved questions exist across the whole pool. Publish more
                        cards with linked questions before sending students to Quiz.
                      </>
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="flex flex-col items-center gap-2 py-5">
                <Icon className={`h-6 w-6 ${color}`} />
                <span className="text-2xl font-bold">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pipeline controls */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-lg">Content Pipeline</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Fetch fresh RSS articles, filter for CLAT relevance, generate
                summaries + blog explainers + quiz questions via Claude Haiku.
                All generated content lands in the review queue — nothing
                auto-publishes.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => runPipeline(true)}
                variant="outline"
                disabled={running}
              >
                {running ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Dry Run (RSS only)
              </Button>
              <Button
                onClick={() => runPipeline(false)}
                disabled={running}
              >
                {running ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Run Full Pipeline
              </Button>
            </div>

            {running && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching RSS feeds and generating content with Claude Haiku...
                This may take 30-60 seconds.
              </div>
            )}

            {/* Result */}
            {result && (
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-2">
                  {result.error ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{result.error}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {result.totalFetched} articles fetched
                        </Badge>
                        <Badge variant="secondary">
                          {result.relevant} CLAT-relevant
                        </Badge>
                        {result.generated !== undefined && (
                          <Badge className="bg-primary/10 text-primary">
                            {result.generated} items generated
                          </Badge>
                        )}
                        {result.questions !== undefined && (
                          <Badge className="bg-blue-100 text-blue-700">
                            {result.questions} questions created
                          </Badge>
                        )}
                      </div>
                      {result.errors && result.errors.length > 0 && (
                        <div className="text-xs text-red-600 space-y-1">
                          {result.errors.map((e, i) => (
                            <p key={i}>{e}</p>
                          ))}
                        </div>
                      )}
                      {result.generated !== undefined && result.generated > 0 && (
                        <Link href="/admin/content">
                          <Button size="sm" variant="outline" className="mt-2">
                            Go to Review Queue
                          </Button>
                        </Link>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
