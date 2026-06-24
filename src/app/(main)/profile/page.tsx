"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Flame, Trophy, Zap, Swords, Target, Phone, GraduationCap, BookOpen } from "lucide-react";
import { MOCK_USER, MOCK_MASTERY } from "@/lib/mock-data";
import { LEAGUE_CONFIG } from "@/lib/types/database";
import { getNextLeagueThreshold } from "@/lib/gamification/leagues";
import { cn } from "@/lib/utils";
import { FunnelLink } from "@/components/funnel/funnel-link";
import { tmcLink, CTA_LABELS } from "@/lib/funnel/links";

export default function ProfilePage() {
  const [user, setUser] = useState(MOCK_USER);
  const [activeDates, setActiveDates] = useState<string[]>([]);

  // Live profile (server-persisted XP/rating/streak)
  useEffect(() => {
    fetch("/api/progress/today", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.xp === "number") {
          setUser((u) => ({
            ...u,
            xp: data.xp,
            rating: data.rating,
            streak_current: data.streak,
            league: data.league ?? u.league,
          }));
        }
        if (Array.isArray(data.activeDates)) setActiveDates(data.activeDates);
      })
      .catch(() => {});
  }, []);

  // Last 28 IST days for the streak calendar
  const calendarDays = (() => {
    const days: Array<{ date: string; label: number }> = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
      days.push({ date: iso, label: Number(iso.slice(8, 10)) });
    }
    return days;
  })();

  // Demo leaderboard — clearly labelled; real one needs multiple accounts
  const leaderboard = [
    { name: "Ananya S.", xp: 612, demo: true },
    { name: "You", xp: user.xp, demo: false },
    { name: "Raghav M.", xp: 318, demo: true },
    { name: "Ishita K.", xp: 240, demo: true },
    { name: "Dev P.", xp: 165, demo: true },
  ].sort((a, b) => b.xp - a.xp);

  const leagueInfo = LEAGUE_CONFIG[user.league];
  const nextThreshold = getNextLeagueThreshold(user.league);

  const stats = [
    { label: "Rating", value: user.rating, icon: Trophy, color: "text-saffron" },
    { label: "XP", value: user.xp, icon: Zap, color: "text-saffron" },
    { label: "Streak", value: user.streak_current, icon: Flame, color: "text-saffron" },
    { label: "Won", value: user.battles_won, icon: Swords, color: "text-primary" },
  ];

  return (
    <>
      <TopBar title="Profile" streak={user.streak_current} />
      <div className="mx-auto max-w-lg space-y-6 px-4 py-4 md:max-w-2xl lg:max-w-3xl lg:py-6">
        {/* Profile Header */}
        <div className="soft-card flex items-center gap-4 rounded-[1.5rem] p-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-xl font-bold text-white">
              {user.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{user.display_name}</h2>
            <Badge variant="secondary" className="mt-1 text-xs">
              {leagueInfo.emoji} {leagueInfo.label} League
            </Badge>
          </div>
        </div>

        {/* XP Progress to next league */}
        {nextThreshold && (
          <Card className="soft-card rounded-[1.5rem] border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{leagueInfo.emoji} {leagueInfo.label}</span>
                <span>{user.xp} / {nextThreshold} XP</span>
              </div>
              <div className="data-track h-2 rounded-full">
                <div
                  className="data-fill h-full rounded-full transition-all"
                  style={{ width: `${Math.min((user.xp / nextThreshold) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {nextThreshold - user.xp} XP to{" "}
                {LEAGUE_CONFIG[
                  user.league === "bronze"
                    ? "silver"
                    : user.league === "silver"
                    ? "gold"
                    : user.league === "gold"
                    ? "platinum"
                    : "diamond"
                ].label}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="soft-card rounded-[1.35rem] border-0">
              <CardContent className="flex flex-col items-center gap-1 p-3">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-lg font-bold tabular-nums">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Topic Mastery */}
        <section>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-coral" />
            Topic Mastery
          </h3>
          <div className="space-y-3">
            {MOCK_MASTERY.map((m) => {
              return (
                <Link
                  key={m.topic}
                  href={`/battle/queue?mode=topic&topic=${m.topic}`}
                  className="soft-card soft-card-hover block rounded-2xl px-4 py-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-black capitalize text-foreground">
                      {m.topic}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-muted-foreground">
                      {m.mastery_pct}% mastery
                    </span>
                  </div>
                  <div className="data-track h-2 rounded-full">
                    <div
                      className="data-fill h-full rounded-full transition-all"
                      style={{ width: `${m.mastery_pct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <Separator />

        {/* Battle Stats */}
        <section>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Swords className="h-4 w-4 text-primary" />
            Battle Summary
          </h3>
          <Card className="soft-card rounded-[1.5rem] border-0">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{user.battles_played}</p>
                  <p className="text-xs text-muted-foreground">Played</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{user.battles_won}</p>
                  <p className="text-xs text-muted-foreground">Won</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {user.battles_played > 0
                      ? Math.round((user.battles_won / user.battles_played) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Streak info */}
        <section>
          <Card className="soft-card rounded-[1.5rem] border-0 bg-saffron-soft">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-saffron-soft">
                <Flame className="h-6 w-6 text-saffron" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[#8a5200]">
                  {user.streak_current} Day Streak
                </p>
                <p className="text-xs text-[#8a5200]">
                  Best streak: {user.streak_best} days | Complete 1 battle or read 5 shorts daily to keep it going!
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Streak calendar — last 28 days */}
        <section>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-saffron" />
            Streak calendar
          </h3>
          <Card className="soft-card rounded-[1.5rem] border-0">
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map(({ date, label }) => {
                  const active = activeDates.includes(date);
                  return (
                    <div
                      key={date}
                      title={`${date}${active ? " · streak day" : ""}`}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-md text-[10px] font-semibold",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground/60"
                      )}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                A day counts when you finish 1 battle or read 5 shorts.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Weekly leaderboard — demo data until accounts go live */}
        <section>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-saffron" />
            Weekly leaderboard
            <Badge variant="secondary" className="text-[10px]">
              Demo
            </Badge>
          </h3>
          <Card className="soft-card rounded-[1.5rem] border-0">
            <CardContent className="divide-y divide-border p-0">
              {leaderboard.map((row, i) => (
                <div
                  key={row.name}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5",
                    !row.demo && "bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-black",
                      i === 0
                        ? "bg-saffron-soft text-[#8a5200]"
                        : i === 1
                        ? "bg-muted text-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn("flex-1 text-sm", !row.demo ? "font-bold" : "font-medium")}>
                    {row.name}
                    {row.demo && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">demo</span>
                    )}
                  </span>
                  <span className="text-sm font-bold tabular-nums">{row.xp} XP</span>
                </div>
              ))}
              <p className="px-4 py-2.5 text-[11px] text-muted-foreground">
                Sample names until student accounts launch — your XP is real.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Conversion CTAs — outbound to 12minutestoclat.com with UTMs */}
        <section className="space-y-3">
          <FunnelLink
            href={tmcLink("profile-prep-plan", "prep-plan")}
            label={CTA_LABELS.prepPlan}
            className="block rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="flex items-center gap-3">
              <div className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{CTA_LABELS.prepPlan}</p>
                <p className="text-xs text-muted-foreground">
                  Daily current affairs is one section — 12 Minutes to CLAT covers the rest.
                </p>
              </div>
              <span className="text-sm font-bold text-primary">→</span>
            </div>
          </FunnelLink>
          <FunnelLink
            href={tmcLink("profile-counselling", "counselling-call")}
            label={CTA_LABELS.counselling}
            className="flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-muted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{CTA_LABELS.counselling}</p>
              <p className="text-xs text-muted-foreground">
                Talk to a mentor about your CLAT {user.target_exam_year ?? 2027} plan.
              </p>
            </div>
            <span className="text-sm font-bold text-muted-foreground">→</span>
          </FunnelLink>
          <Link
            href="/blog"
            className="flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-muted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saffron-soft text-saffron">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">CLAT guides</p>
              <p className="text-xs text-muted-foreground">
                Free strategy reads — current affairs, negative marking, syllabus.
              </p>
            </div>
            <span className="text-sm font-bold text-muted-foreground">→</span>
          </Link>
        </section>

        <div className="h-20" /> {/* Bottom nav clearance */}
      </div>
    </>
  );
}
