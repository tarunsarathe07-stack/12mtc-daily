"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { Crown } from "@/components/brand/crown";

interface TopBarProps {
  title?: string;
  streak?: number;
}

export function TopBar({ title, streak = 0 }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-card/88 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/today" className="flex items-center gap-2.5" aria-label="Go to Today">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-saffron/18 shadow-sm shadow-saffron/10">
            <Crown size={24} />
          </span>
          <h1 className="display-title text-lg text-foreground">
            {title || "12 Minutes Daily"}
          </h1>
        </Link>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-saffron/15 px-3 py-1.5 text-sm font-bold text-saffron">
            <Flame className="animate-flame h-4 w-4" />
            <span className="tabular-nums">{streak}</span>
          </div>
        )}
      </div>
    </header>
  );
}
