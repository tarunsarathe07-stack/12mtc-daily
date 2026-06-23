"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Radio, Sparkles } from "lucide-react";
import { TOPIC_COLORS, type TopicTag } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type FreshItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
  topics: TopicTag[];
};

export function FreshTodayPanel() {
  const [items, setItems] = useState<FreshItem[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await fetch("/api/content/fresh", { cache: "no-store" });
        if (!response.ok) throw new Error("Fresh feed unavailable");
        const data = await response.json();
        if (!ignore) {
          setItems(data.items || []);
          setGeneratedAt(data.generatedAt || null);
        }
      } catch {
        if (!ignore) setFailed(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="space-y-4 border-t border-border pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="editorial-kicker text-primary">Live discovery</p>
          <h3 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight">
            <Radio className="h-4 w-4 text-saffron" />
            Original sources from today
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Trusted feeds become student cards only after review.
          </p>
        </div>
        {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {failed ? (
        <p className="rounded-xl border border-border bg-card/70 p-3 text-sm text-muted-foreground">
          Fresh feed could not load. Check internet access or source availability.
        </p>
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {items.slice(0, 8).map((item) => {
            const topic = item.topics[0];
            const colors = TOPIC_COLORS[topic];
            return (
              <a
                key={`${item.source}-${item.link}`}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="group block py-3"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", colors?.bg, colors?.text)}>
                    {topic}
                  </span>
                  <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {item.source}
                  </span>
                  <Sparkles className="ml-auto h-3 w-3 text-saffron" />
                </div>
                <p className="line-clamp-2 text-sm font-bold leading-snug tracking-tight transition-colors group-hover:text-primary">
                  {item.title}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Awaiting review</p>
              </a>
            );
          })}
        </div>
      )}

      {generatedAt && (
        <p className="text-[11px] text-muted-foreground">
          Refreshed {new Date(generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </section>
  );
}
