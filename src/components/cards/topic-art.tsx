/**
 * Original branded topic artwork — used when a news card has no image.
 * Duotone plates: deep-blue field, saffron geometry, one drawn icon.
 * Same family across topics, distinct silhouette per topic.
 */

import {
  Landmark,
  Scale,
  Globe2,
  TrendingUp,
  TreePine,
  Award,
  FileBarChart,
} from "lucide-react";
import type { TopicTag } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const TOPIC_ICON: Record<TopicTag, React.ComponentType<{ className?: string }>> = {
  polity: Landmark,
  legal: Scale,
  international: Globe2,
  economy: TrendingUp,
  environment: TreePine,
  awards: Award,
  reports: FileBarChart,
};

export function TopicArt({
  topic,
  className,
  slot,
}: {
  topic: TopicTag;
  className?: string;
  slot?: number | null;
}) {
  const Icon = TOPIC_ICON[topic] ?? Landmark;
  return (
    <div
      className={cn(
        "bg-ink relative flex h-24 items-center justify-between overflow-hidden rounded-xl px-5",
        className
      )}
      aria-hidden
    >
      {/* Saffron geometry — rising bars echo the crown */}
      <svg
        className="absolute inset-y-0 right-0 h-full"
        viewBox="0 0 160 96"
        fill="none"
        preserveAspectRatio="xMaxYMid slice"
      >
        <rect x="96" y="48" width="14" height="60" rx="4" fill="oklch(0.76 0.155 70 / 0.25)" />
        <rect x="118" y="28" width="14" height="80" rx="4" fill="oklch(0.76 0.155 70 / 0.45)" />
        <rect x="140" y="40" width="14" height="68" rx="4" fill="oklch(0.76 0.155 70 / 0.8)" />
        <circle cx="30" cy="-8" r="40" fill="oklch(1 0 0 / 0.045)" />
      </svg>
      <div className="relative flex items-center gap-3">
        <Icon className="h-8 w-8 text-saffron" />
        <span className="text-sm font-bold capitalize tracking-wide text-white/90">{topic}</span>
      </div>
      {slot ? (
        <span className="font-display relative text-4xl font-bold text-white/15">
          {String(slot).padStart(2, "0")}
        </span>
      ) : null}
    </div>
  );
}
