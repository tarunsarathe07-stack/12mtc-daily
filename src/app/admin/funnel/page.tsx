"use client";

/**
 * Admin funnel dashboard — conversion events overview.
 * Counts by stage + recent event stream. Protected like the rest of /admin.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Swords, Target, FileText, UserRound } from "lucide-react";
import type { ConversionEvent } from "@/lib/types/database";

const STAGES = [
  { type: "read_12_complete", label: "Finished daily 12", icon: BookOpen, color: "text-blue-500" },
  { type: "battle_complete", label: "Battles completed", icon: Swords, color: "text-primary" },
  { type: "weak_topic_shown", label: "Weak topics shown", icon: Target, color: "text-amber-500" },
  { type: "blog_cta_click", label: "Blog CTA clicks", icon: FileText, color: "text-primary" },
  { type: "profile_cta_click", label: "Profile CTA clicks", icon: UserRound, color: "text-rose-500" },
];

export default function FunnelPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [events, setEvents] = useState<ConversionEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load");
        setCounts(data.counts || {});
        setEvents(data.events || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Conversion Funnel</h1>
            <p className="text-sm text-muted-foreground">
              Where students are in the journey to 12 Minutes to CLAT
            </p>
          </div>
          <Link href="/admin">
            <Button variant="outline" size="sm">
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {error && (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        )}

        {/* Stage counts */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {STAGES.map(({ type, label, icon: Icon, color }) => (
            <Card key={type}>
              <CardContent className="flex flex-col items-center gap-2 py-5">
                <Icon className={`h-6 w-6 ${color}`} />
                <span className="text-2xl font-black tabular-nums">{counts[type] ?? 0}</span>
                <span className="text-center text-xs text-muted-foreground">{label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent events */}
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-bold">Recent events ({events.length})</h2>
            </div>
            {events.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No events yet — they appear as students read, battle, and click CTAs.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {events.slice(0, 50).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {e.event_type}
                    </Badge>
                    <span className="flex-1 truncate text-xs text-muted-foreground">
                      {e.cta_label ? `"${e.cta_label}"` : ""} {e.path ? `· ${e.path}` : ""}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
