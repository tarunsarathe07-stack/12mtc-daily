"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Flame, ShieldCheck, TimerReset } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "read", label: "Read", title: "Source-backed card", helper: "A full image card with the headline, source and short exam-useful summary." },
  { id: "angle", label: "Learn", title: "Why it matters", helper: "A compact CLAT angle so the story becomes recallable, not just readable." },
  { id: "quiz", label: "Quiz", title: "12-question check", helper: "Answer with exam scoring: +1, -0.25, skipped 0." },
  { id: "streak", label: "Streak", title: "Progress that returns", helper: "Your result updates streak, weak topics and saved revision cards." },
] as const;

type StageId = (typeof STAGES)[number]["id"];

export function RitualPreview() {
  const [stage, setStage] = useState<StageId>("read");
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const index = STAGES.findIndex((item) => item.id === stage);
  const active = STAGES[index];

  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(() => setStage((current) => STAGES[(STAGES.findIndex((item) => item.id === current) + 1) % STAGES.length].id), 3600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [stage, paused]);

  return (
    <section className="stitch-card-strong overflow-hidden rounded-lg">
      <div className="grid grid-cols-4 border-b border-border bg-muted/50">
        {STAGES.map((item) => (
          <button key={item.id} onClick={() => { setStage(item.id); setPaused(true); }} className={cn("group relative flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold text-muted-foreground", item.id === stage && "bg-white text-primary")}>
            <span>{item.label}</span>
            <span className={cn("absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-saffron transition-transform", item.id === stage && "scale-x-100")} />
          </button>
        ))}
      </div>
      <div className="grid gap-0 p-4 sm:p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
        <div className="relative min-h-[340px] overflow-hidden rounded-lg border border-border bg-white p-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={stage} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }} className="h-full">
              {stage === "read" && <ReadScene />}
              {stage === "angle" && <AngleScene />}
              {stage === "quiz" && <QuizScene />}
              {stage === "streak" && <StreakScene />}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex flex-col justify-between p-5 lg:p-7">
          <div>
            <p className="editorial-kicker text-saffron">Step {index + 1} of 4</p>
            <h3 className="mt-2 text-2xl font-bold">{active.title}</h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{active.helper}</p>
          </div>
          <div className="mt-8 space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-primary/10"><motion.div className="h-full rounded-full bg-saffron" animate={{ width: `${((index + 1) / STAGES.length) * 100}%` }} /></div>
            <div className="flex items-center justify-between rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white">
              <span>Next action stays obvious</span><ArrowRight className="h-4 w-4 text-saffron" />
            </div>
          </div>
        </div>
      </div>
      <p className="border-t border-border/70 px-6 py-4 text-sm font-semibold text-muted-foreground"><span className="font-black text-foreground">Every day:</span> read 12 cards &rarr; learn the angle &rarr; take the quiz &rarr; protect your streak.</p>
    </section>
  );
}

function ReadScene() {
  return <div className="flex h-full flex-col justify-between">
    <div>
      <div className="mb-5 h-36 rounded-lg bg-[#e6eef5]" />
      <div className="flex items-center gap-2 text-xs font-semibold text-primary"><ShieldCheck className="h-3.5 w-3.5" /> The Hindu <span className="text-muted-foreground">today</span></div>
      <h4 className="mt-3 max-w-lg text-2xl font-bold leading-snug">Supreme Court reserves judgment on electoral bonds</h4>
    </div>
    <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm leading-6">The summary highlights only the exam-useful constitutional issue.</div>
  </div>;
}

function AngleScene() {
  return <div className="flex h-full flex-col justify-center gap-4">
    {["Constitutional power", "Transparency in elections", "Likely passage trap"].map((item, i) => <div key={item} className="stitch-pill flex items-center gap-3 px-4 py-4"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">{i + 1}</span><span className="font-semibold">{item}</span></div>)}
  </div>;
}

function QuizScene() {
  return <div className="flex h-full flex-col justify-between">
    <div className="flex items-center justify-between"><p className="editorial-kicker text-primary">Question 4 of 12</p><span className="stitch-pill flex items-center gap-2 px-3 py-2 text-sm font-black"><TimerReset className="h-4 w-4 text-saffron" />08:42</span></div>
    <p className="mt-8 text-xl font-bold leading-8">Which constitutional principle is most directly tested by this story?</p>
    <div className="mt-6 space-y-3">
      {["Basic structure", "Legislative competence", "Territorial jurisdiction"].map((answer, i) => <div key={answer} className={cn("rounded-lg bg-white px-4 py-3 text-sm font-semibold ring-1 ring-border", i === 1 && "bg-primary/8 ring-primary")}><span className="mr-3 text-primary">{String.fromCharCode(65 + i)}</span>{answer}</div>)}
    </div>
  </div>;
}

function StreakScene() {
  return <div className="flex h-full flex-col justify-center text-center">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-saffron/18"><Flame className="h-8 w-8 text-[#b77b00]" /></div>
    <p className="mt-5 text-3xl font-bold text-primary">14 days</p>
    <p className="mt-2 text-sm font-semibold text-muted-foreground">Current streak protected</p>
    <div className="mt-6 grid grid-cols-7 gap-2">{Array.from({ length: 14 }).map((_, i) => <span key={i} className={cn("h-8 rounded-lg", i > 10 ? "bg-saffron" : "bg-saffron/45")} />)}</div>
  </div>;
}
