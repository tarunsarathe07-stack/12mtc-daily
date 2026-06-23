"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PipelineRun {
  id: string;
  run_date: string;
  sources_queried: string[];
  urls_discovered: string[];
  items_generated: number;
  status: string;
  error_log: string | null;
  created_at: string;
}

export default function AdminPipelinePage() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content/runs", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setRuns(data.runs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
            <h1 className="text-xl font-bold">Pipeline Runs</h1>
            <p className="text-sm text-muted-foreground">
              History of content ingestion runs
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : runs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No pipeline runs yet. Go to the{" "}
                <Link href="/admin" className="text-primary hover:underline">
                  Admin Dashboard
                </Link>{" "}
                to run the content pipeline.
              </p>
            </CardContent>
          </Card>
        ) : (
          runs.map((run) => (
            <Card key={run.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {run.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    ) : run.status === "failed" ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                    )}
                    <span className="text-sm font-medium">
                      {new Date(run.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <Badge
                    className={cn(
                      "text-[10px]",
                      run.status === "completed"
                        ? "bg-primary/10 text-primary"
                        : run.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {run.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{run.urls_discovered.length} URLs discovered</span>
                  <span>•</span>
                  <span>{run.items_generated} items generated</span>
                  <span>•</span>
                  <span>Sources: {run.sources_queried.join(", ")}</span>
                </div>

                {run.error_log && (
                  <div className="rounded bg-red-50 p-2 text-xs text-red-700 whitespace-pre-wrap">
                    {run.error_log}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
