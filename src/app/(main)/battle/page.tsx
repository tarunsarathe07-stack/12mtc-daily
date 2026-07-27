"use client";

import { TopBar } from "@/components/layout/top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Swords, Zap, Globe, Scale, Landmark, TreePine, Award } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MOCK_USER, MOCK_MASTERY } from "@/lib/mock-data";

const topicMeta = [
  { id: "polity", label: "Polity", icon: Landmark, color: "bg-primary/10 text-primary" },
  { id: "legal", label: "Legal", icon: Scale, color: "bg-primary/10 text-primary" },
  { id: "international", label: "International", icon: Globe, color: "bg-saffron-soft text-ink" },
  { id: "economy", label: "Economy", icon: Zap, color: "bg-primary/10 text-primary" },
  { id: "environment", label: "Environment", icon: TreePine, color: "bg-saffron-soft text-ink" },
  { id: "awards", label: "Awards & Reports", icon: Award, color: "bg-saffron-soft text-ink" },
];

export default function BattlePage() {
  return (
    <>
      <TopBar title="Quiz" streak={MOCK_USER.streak_current} />
      <div className="mx-auto max-w-lg space-y-7 px-4 py-5 md:max-w-2xl lg:max-w-4xl lg:py-8">
        {/* Daily Battle */}
        <Card className="soft-card overflow-hidden rounded-lg">
          <CardContent className="p-0">
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Swords className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Today&apos;s quiz battle</h2>
                  <p className="text-sm text-muted-foreground">
                    12 questions from today&apos;s current affairs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs">
                  +1 / -0.25 scoring
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  15 sec/question
                </Badge>
              </div>
              <Link href="/battle/queue?mode=daily">
                <Button variant="brand" className="mt-2 h-11 w-full" size="lg">
                  Start quiz battle
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Topic Duels */}
        <div>
          <div className="mb-3 flex items-end justify-between gap-4"><div><p className="editorial-kicker text-primary">Practice by weakness</p><h3 className="mt-1 text-xl font-bold">Topic practice</h3></div><span className="text-xs font-medium text-muted-foreground">Speed breaks ties</span></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {topicMeta.map(({ id, label, icon: Icon, color }) => {
              const mastery = MOCK_MASTERY.find((m) => m.topic === id)?.mastery_pct || 0;
              return (
                <Link key={id} href={`/battle/queue?mode=topic&topic=${id}`}>
                  <Card className="soft-card h-full cursor-pointer rounded-lg transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
                    <CardContent className="p-4 space-y-2">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-sm">{label}</p>
                      <div className="flex items-center gap-2">
                        <div className="data-track h-1.5 flex-1 rounded-full">
                          <div
                            className="data-fill h-full rounded-full transition-all"
                            style={{ width: `${mastery}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{mastery}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
