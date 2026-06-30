"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Loader2,
  Eye,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TOPIC_COLORS, type TopicTag } from "@/lib/types/database";

const OUTSIDE_LEGAL_MARKERS = [
  "res judicata","mens rea","actus reus","strict liability","absolute liability",
  "basic structure","writ of mandamus","certiorari","habeas corpus",
  "article 32","article 226","article 14","article 19","article 21","article 246",
  "doctrine","ratio decidendi","obiter","stare decisis","special leave petition",
  "criminal procedure code","indian penal code","evidence act",
  "specific relief","tort","negligence","vicarious liability","promissory estoppel",
];

function outsideLegalWarnings(item: ContentItemWithQuestions): string[] {
  const passageText = [item.title, item.summary, item.body, item.why_it_matters]
    .filter(Boolean).join(" ").toLowerCase();
  const warnings: string[] = [];
  item.questions.forEach((q, i) => {
    const qText = [q.prompt, ...q.options.map(o => o.text), q.explanation]
      .join(" ").toLowerCase();
    const hits = OUTSIDE_LEGAL_MARKERS.filter(t => qText.includes(t) && !passageText.includes(t));
    if (hits.length > 0) warnings.push(`Q${i + 1}: outside legal knowledge (${hits.slice(0, 2).join(", ")})`);
  });
  return warnings;
}

interface QuestionItem {
  id: string;
  prompt: string;
  options: { label: string; text: string }[];
  correct_option: string;
  explanation: string;
  status: string;
}

interface ContentItemWithQuestions {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  why_it_matters: string | null;
  topic_tags: TopicTag[];
  source_urls: string[];
  difficulty: string;
  status: string;
  review_notes: string | null;
  created_at: string;
  questions: QuestionItem[];
}

interface Stats {
  total: number;
  review: number;
  approved: number;
  published: number;
  rejected: number;
  todayPublished?: number;
}

type StatusFilter = "all" | "review" | "approved" | "published" | "rejected";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  review: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  published: "bg-primary/10 text-primary",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItemWithQuestions[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, review: 0, approved: 0, published: 0, rejected: 0 });
  const [filter, setFilter] = useState<StatusFilter>("review");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({
    title: "",
    source: "Indian Express",
    url: "",
    snippet: "",
    topic: "",
  });

  const loadItems = useCallback(async () => {
    try {
      const param = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/content/list${param}`, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
      setStats(data.stats || stats);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadItems();
  }, [loadItems]);

  const handleAction = async (
    id: string,
    action: "approve" | "publish" | "reject"
  ) => {
    setActionLoading(id);
    try {
      await fetch("/api/content/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      await loadItems();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualCandidate = async () => {
    setManualLoading(true);
    setManualMessage(null);
    try {
      const payload = {
        title: manualForm.title,
        source: manualForm.source,
        url: manualForm.url || undefined,
        snippet: manualForm.snippet || undefined,
        topics: manualForm.topic ? [manualForm.topic] : undefined,
      };
      const res = await fetch("/api/content/manual-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Manual candidate failed");
      setManualMessage(`Added to review: ${data.item?.title ?? manualForm.title}`);
      setManualForm({
        title: "",
        source: "Indian Express",
        url: "",
        snippet: "",
        topic: "",
      });
      setFilter("review");
      await loadItems();
    } catch (err) {
      setManualMessage(err instanceof Error ? err.message : "Manual candidate failed");
    } finally {
      setManualLoading(false);
    }
  };

  const filterTabs: { label: string; value: StatusFilter; count: number }[] = [
    { label: "Pending", value: "review", count: stats.review },
    { label: "Approved", value: "approved", count: stats.approved },
    { label: "Published", value: "published", count: stats.published },
    { label: "Rejected", value: "rejected", count: stats.rejected },
    { label: "All", value: "all", count: stats.total },
  ];

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link
            href="/admin"
            className="rounded-full p-1.5 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Content Review Queue</h1>
            <p className="text-sm text-muted-foreground">
              Review, approve, or reject AI-generated content
              {stats.todayPublished !== undefined && (
                <> &mdash; <span className={stats.todayPublished >= 12 ? "text-primary font-semibold" : "text-amber-600 font-semibold"}>{stats.todayPublished}/12 published today</span></>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6 space-y-4">
        <Card>
          <button
            onClick={() => setManualOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-soft text-saffron">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">Add important story manually</p>
                <p className="text-sm text-muted-foreground">
                  For intern-curated stories that RSS missed. Creates review content, not a live card.
                </p>
              </div>
            </div>
            {manualOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {manualOpen && (
            <CardContent className="border-t pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">Title</span>
                  <input
                    value={manualForm.title}
                    onChange={(e) => setManualForm((form) => ({ ...form, title: e.target.value }))}
                    placeholder="Example: At G7 meet, India can be the voice of developing countries"
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Source</span>
                  <input
                    value={manualForm.source}
                    onChange={(e) => setManualForm((form) => ({ ...form, source: e.target.value }))}
                    placeholder="Indian Express"
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Primary topic</span>
                  <select
                    value={manualForm.topic}
                    onChange={(e) => setManualForm((form) => ({ ...form, topic: e.target.value }))}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Infer automatically</option>
                    <option value="legal">Legal</option>
                    <option value="polity">Polity</option>
                    <option value="international">International</option>
                    <option value="economy">Economy</option>
                    <option value="environment">Environment</option>
                    <option value="reports">Reports</option>
                  </select>
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">Source link, optional</span>
                  <input
                    value={manualForm.url}
                    onChange={(e) => setManualForm((form) => ({ ...form, url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">Notes/snippet, optional but recommended</span>
                  <textarea
                    value={manualForm.snippet}
                    onChange={(e) => setManualForm((form) => ({ ...form, snippet: e.target.value }))}
                    placeholder="Paste the paragraph or intern note here. The AI will stick to this material."
                    rows={4}
                    className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleManualCandidate}
                  disabled={manualLoading || !manualForm.title.trim()}
                >
                  {manualLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate review card
                </Button>
                {manualMessage && (
                  <p className="text-sm text-muted-foreground">{manualMessage}</p>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                filter === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                  filter === tab.value
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-background"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Items */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {filter === "review"
                  ? "No cards waiting for review. Run the pipeline from Admin → Pipeline or wait for the daily cron."
                  : `No ${filter === "all" ? "" : filter} items.`}
              </p>
              {filter === "review" && (
                <Link href="/admin/pipeline">
                  <Button variant="outline" size="sm" className="mt-3">
                    Go to Pipeline
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const isExpanded = expandedId === item.id;
              const approvedQuestionCount = item.questions.filter(
                (q) => q.status === "approved"
              ).length;
              const hasQuestions = item.questions.length > 0;
              return (
                <Card key={item.id} className="overflow-hidden">
                  {/* Header row */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : item.id)
                    }
                    className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            "text-[10px]",
                            STATUS_COLORS[item.status]
                          )}
                        >
                          {item.status}
                        </Badge>
                        {item.topic_tags.map((tag) => {
                          const colors = TOPIC_COLORS[tag];
                          return (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className={cn(
                                "text-[10px] capitalize",
                                colors?.bg,
                                colors?.text
                              )}
                            >
                              {tag}
                            </Badge>
                          );
                        })}
                        <Badge variant="outline" className="text-[10px]">
                          {item.difficulty}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            hasQuestions
                              ? "border-primary/25 bg-primary/5 text-primary"
                              : "border-red-200 bg-red-50 text-red-700"
                          )}
                        >
                          {item.questions.length} question{item.questions.length === 1 ? "" : "s"}
                          {approvedQuestionCount > 0 ? ` · ${approvedQuestionCount} approved` : ""}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm leading-snug">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.summary}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                    )}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-4">
                      {/* Pipeline notes (CLAT category + selection reason) */}
                      {item.review_notes && (
                        <Card className="border-muted bg-muted/30">
                          <CardContent className="p-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Pipeline notes
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {item.review_notes}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Why it matters */}
                      {item.why_it_matters && (
                        <Card className="border-amber-200 bg-amber-50">
                          <CardContent className="p-3">
                            <p className="text-xs font-semibold text-amber-800 mb-1">
                              Why it matters for CLAT
                            </p>
                            <p className="text-xs text-amber-700">
                              {item.why_it_matters}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Blog preview */}
                      {item.body && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            Blog Body Preview
                          </p>
                          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                            {item.body}
                          </div>
                        </div>
                      )}

                      {/* Questions */}
                      {item.questions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            Quiz Questions ({item.questions.length})
                          </p>
                          {outsideLegalWarnings(item).map((w, i) => (
                            <p key={i} className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1">
                              ⚠ {w}
                            </p>
                          ))}
                          <div className="space-y-2">
                            {item.questions.map((q, idx) => (
                              <div
                                key={q.id}
                                className="rounded-lg border p-3 space-y-1"
                              >
                                <p className="text-xs font-medium">
                                  Q{idx + 1}. {q.prompt}
                                </p>
                                <div className="grid grid-cols-2 gap-1">
                                  {q.options.map((opt) => (
                                    <p
                                      key={opt.label}
                                      className={cn(
                                        "text-[11px] px-2 py-1 rounded",
                                        opt.label === q.correct_option
                                          ? "bg-primary/5 text-primary font-medium"
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      {opt.label}) {opt.text}
                                    </p>
                                  ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">
                                  {q.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sources */}
                      {item.source_urls.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          Source:{" "}
                          {item.source_urls.map((u) => (
                            <a
                              key={u}
                              href={u}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {new URL(u).hostname}
                            </a>
                          ))}
                        </p>
                      )}

                      <Separator />

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {item.status === "review" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAction(item.id, "publish")}
                              disabled={actionLoading === item.id || !hasQuestions}
                              title={!hasQuestions ? "Add quiz questions before publishing" : undefined}
                            >
                              {actionLoading === item.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle className="mr-1 h-3 w-3" />
                              )}
                              Approve & Publish
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(item.id, "approve")}
                              disabled={actionLoading === item.id}
                            >
                              Approve (keep draft)
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(item.id, "reject")}
                              disabled={actionLoading === item.id}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Reject
                            </Button>
                          </>
                        )}
                        {item.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={() => handleAction(item.id, "publish")}
                            disabled={actionLoading === item.id || !hasQuestions}
                            title={!hasQuestions ? "Add quiz questions before publishing" : undefined}
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Publish
                          </Button>
                        )}
                        {!hasQuestions && item.status !== "published" && (
                          <span className="text-xs font-medium text-red-600">
                            Needs quiz questions before publishing.
                          </span>
                        )}
                        {item.status === "published" && (
                          <Link href={`/daily/${item.slug}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="mr-1 h-3 w-3" />
                              View Live
                            </Button>
                          </Link>
                        )}
                        {item.status === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(item.id, "approve")}
                            disabled={actionLoading === item.id}
                          >
                            Restore to Review
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
