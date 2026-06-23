"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Flame, Lock, Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * CLAT Arena — a premium exam cockpit, not a game show.
 * Calm intensity: ink surfaces, hairline borders, deep-blue focus and saffron momentum,
 * coral reserved for urgency and wrong answers.
 *
 * Server-authoritative: questions arrive WITHOUT answers; every submission
 * is scored by POST /api/battle/answer. CLAT scoring: +1 / −0.25 / 0,
 * speed is only a tiebreaker.
 */

interface SessionPayload {
  sessionId: string;
  mode: string;
  topic: string | null;
  timePerQuestionSec: number;
  bot: { name: string; avatar: string };
  botDelaysMs: number[];
  questions: Array<{
    id: string;
    prompt: string;
    options: Array<{ label: string; text: string }>;
    topic: string;
    difficulty: string;
  }>;
}

interface RevealData {
  correctOption: string;
  explanation: string;
  playerPoints: number;
  playerCorrect: boolean;
  botOption: string;
  botCorrect: boolean;
  botPoints: number;
  totals: { player: number; bot: number };
}

type RailState = "correct" | "wrong" | "skipped";

export default function BattleRoomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.roomId as string;

  const [session, setSession] = useState<SessionPayload | null>(null);
  const [missing, setMissing] = useState(false);
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [locked, setLocked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [botAnswered, setBotAnswered] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [totals, setTotals] = useState({ player: 0, bot: 0 });
  const [rail, setRail] = useState<RailState[]>([]);
  const [finishing, setFinishing] = useState(false);
  const questionStart = useRef(Date.now());
  const submitting = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(`tmd-battle-${sessionId}`);
    if (!raw) {
      setMissing(true);
      return;
    }
    try {
      setSession(JSON.parse(raw) as SessionPayload);
    } catch {
      setMissing(true);
    }
  }, [sessionId]);

  const total = session?.questions.length ?? 0;
  const question = session?.questions[idx];
  const timePerQ = session?.timePerQuestionSec ?? 15;

  const submit = useCallback(
    async (option: string | null) => {
      if (!session || reveal || submitting.current) return;
      submitting.current = true;
      if (option) setLocked(option);
      const timeMs = Date.now() - questionStart.current;

      try {
        const res = await fetch("/api/battle/answer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: session.sessionId,
            questionIndex: idx,
            selectedOption: option,
            timeMs,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setReveal(data as RevealData);
          setTotals(data.totals);
          setRail((r) => [
            ...r,
            data.playerCorrect ? "correct" : option ? "wrong" : "skipped",
          ]);
          if (data.playerCorrect) {
            setCombo((c) => {
              const next = c + 1;
              setBestCombo((b) => Math.max(b, next));
              return next;
            });
          } else {
            setCombo(0);
          }
        }
      } catch {
        setLocked(null);
      } finally {
        submitting.current = false;
      }
    },
    [session, reveal, idx]
  );

  useEffect(() => {
    if (!session || reveal) return;
    setTimeLeft(timePerQ);
    questionStart.current = Date.now();
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          submit(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, session, reveal === null]);

  useEffect(() => {
    if (!session || reveal) return;
    setBotAnswered(false);
    const delay = session.botDelaysMs[idx] ?? 5000;
    const t = setTimeout(() => setBotAnswered(true), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, session]);

  const next = useCallback(async () => {
    if (!session) return;
    if (idx + 1 < total) {
      setReveal(null);
      setLocked(null);
      setIdx((i) => i + 1);
      return;
    }
    setFinishing(true);
    try {
      const res = await fetch("/api/battle/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
      const summary = await res.json();
      if (res.ok) {
        summary.bestCombo = bestCombo;
        sessionStorage.setItem(`tmd-result-${session.sessionId}`, JSON.stringify(summary));
        sessionStorage.removeItem(`tmd-battle-${session.sessionId}`);
        router.push(`/battle/${session.sessionId}/results`);
        return;
      }
    } catch {
      // fall through
    }
    setFinishing(false);
  }, [session, idx, total, bestCombo, router]);

  if (missing) {
    return (
      <div className="bg-ink flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-white/50">This battle has expired or was opened directly.</p>
        <Link
          href="/battle"
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Start a new battle
        </Link>
      </div>
    );
  }

  if (!session || !question) {
    return (
      <div className="bg-ink flex min-h-dvh items-center justify-center">
        <span className="animate-pulse text-white/40">Entering the arena…</span>
      </div>
    );
  }

  // Score race shares (negatives clamp to 0 for the visual)
  const pShare = Math.max(totals.player, 0);
  const bShare = Math.max(totals.bot, 0);
  const raceTotal = pShare + bShare;
  const playerPct = raceTotal === 0 ? 50 : (pShare / raceTotal) * 100;

  const timerFrac = timeLeft / timePerQ;
  const timerUrgent = timeLeft <= 5;

  return (
    <div className="surface-grid bg-ink flex min-h-dvh flex-col text-white">
      {/* ── Cockpit header ── */}
      <header className="border-b border-white/[0.08]">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4 lg:max-w-4xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <User className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">You</p>
              <motion.p
                key={totals.player}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                className="text-base font-black tabular-nums leading-none"
              >
                {totals.player.toFixed(2)}
              </motion.p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
              CLAT Arena
            </p>
            {combo >= 2 ? (
              <motion.span
                key={combo}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-coral inline-flex items-center gap-1 text-xs font-black"
              >
                <Flame className="h-3 w-3" /> ×{combo}
              </motion.span>
            ) : (
              <p className="text-xs font-bold tabular-nums text-white/50">
                {idx + 1} / {total}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {session.bot.name}
              </p>
              <motion.p
                key={totals.bot}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                className="text-base font-black tabular-nums leading-none"
              >
                {totals.bot.toFixed(2)}
              </motion.p>
            </div>
            <div className="bg-ink-panel relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10">
              <Bot className="h-4.5 w-4.5 text-white/70" />
              {!reveal && botAnswered && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary"
                >
                  <Check className="h-2.5 w-2.5 text-white" />
                </motion.span>
              )}
            </div>
          </div>
        </div>

        {/* Score race — quiet, precise */}
        <div className="flex h-[3px] w-full bg-white/[0.06]">
          <motion.div
            className="h-full bg-saffron"
            animate={{ width: `${playerPct}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 22 }}
          />
          <div className="h-full flex-1 bg-white/20" />
        </div>
      </header>

      {/* ── Question rail: 12 segments, answer states ── */}
      <div className="mx-auto w-full max-w-2xl px-4 pt-4 lg:max-w-4xl">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => {
            const state = rail[i];
            const isCurrent = i === idx;
            return (
              <div
                key={i}
                className={cn(
                  "flex h-6 flex-1 items-center justify-center rounded-md border text-[10px] font-bold transition-colors",
                  isCurrent && !state && "border-saffron bg-saffron/20 text-white",
                  !isCurrent && !state && "border-white/[0.07] bg-white/[0.03] text-white/30",
                  state === "correct" && "border-primary/50 bg-primary text-white",
                  state === "wrong" && "border-coral/50 bg-coral text-white",
                  state === "skipped" && "border-white/10 bg-white/10 text-white/50"
                )}
                title={`Question ${i + 1}`}
              >
                {state === "correct" ? (
                  <Check className="h-3 w-3" />
                ) : state === "wrong" ? (
                  <X className="h-3 w-3" />
                ) : state === "skipped" ? (
                  <Minus className="h-3 w-3" />
                ) : (
                  i + 1
                )}
              </div>
            );
          })}
        </div>

        {/* Timer — refined linear system */}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className={cn("h-full rounded-full", timerUrgent ? "bg-coral" : "bg-saffron")}
              animate={{ width: `${timerFrac * 100}%` }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>
          <span
            className={cn(
              "w-8 text-right text-sm font-black tabular-nums",
              timerUrgent ? "text-coral" : "text-white/70"
            )}
          >
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* ── Question + options ── */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-5 lg:max-w-4xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-4 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-6"
          >
            <div className="mb-6 border-b border-white/[0.08] pb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
                Question {idx + 1} of {total}
              </p>
              <p className="mt-3 text-xl font-black leading-snug tracking-[-0.02em] text-white lg:text-2xl">
                {question.prompt}
              </p>
            </div>

            <div className="grid flex-1 content-start gap-2.5 sm:grid-cols-2">
              {question.options.map((opt) => {
                const isLocked = locked === opt.label;
                const isCorrectOpt = reveal && opt.label === reveal.correctOption;
                const isWrongPick = reveal && isLocked && !isCorrectOpt;
                const isBotPick = reveal && opt.label === reveal.botOption;

                return (
                  <motion.button
                    key={opt.label}
                    onClick={() => submit(opt.label)}
                    disabled={!!locked || !!reveal}
                    whileTap={!locked && !reveal ? { scale: 0.99 } : undefined}
                    animate={isWrongPick ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      "bg-ink-panel relative min-h-[72px] rounded-xl border p-4 text-left transition-all",
                      !reveal && !isLocked && "border-white/[0.08] hover:border-saffron/70 hover:bg-white/[0.06]",
                      !reveal && isLocked && "border-saffron bg-saffron/10",
                      reveal && isCorrectOpt && "border-primary bg-primary/15",
                      reveal && isWrongPick && "border-coral bg-coral/10",
                      reveal && !isCorrectOpt && !isWrongPick && "opacity-35",
                      (locked || reveal) && "cursor-default"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-black",
                          isCorrectOpt
                            ? "bg-primary text-white"
                            : isWrongPick
                            ? "bg-coral text-white"
                            : isLocked
                            ? "bg-saffron text-ink"
                            : "bg-white/[0.08] text-white/50"
                        )}
                      >
                        {opt.label}
                      </span>
                      <span className="pt-0.5 text-sm font-medium leading-snug text-white/90">
                        {opt.text}
                      </span>
                    </div>

                    {isLocked && !reveal && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-3 top-3"
                      >
                        <Lock className="h-3.5 w-3.5 text-primary-foreground/80" />
                      </motion.span>
                    )}
                    {reveal && (isLocked || isBotPick) && (
                      <div className="absolute right-3 top-3 flex gap-1">
                        {isLocked && (
                          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                            You
                          </span>
                        )}
                        {isBotPick && (
                          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/50">
                            Bot
                          </span>
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* ── Reveal ── */}
            <AnimatePresence>
              {reveal && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 space-y-3"
                >
                  <div className="flex items-center justify-center gap-2.5">
                    <span
                      className={cn(
                        "rounded-lg px-3 py-1 text-sm font-black",
                        reveal.playerCorrect
                          ? "bg-primary/15 text-primary-foreground"
                          : locked
                          ? "bg-coral/15 text-coral"
                          : "bg-white/[0.06] text-white/50"
                      )}
                    >
                      {reveal.playerCorrect ? "+1.00" : locked ? "−0.25" : "Skipped · 0"}
                    </span>
                    <span className="text-xs font-semibold text-white/40">
                      Bot {reveal.botCorrect ? "+1.00" : "−0.25"}
                    </span>
                  </div>

                  <div className="bg-ink-panel rounded-xl border border-white/[0.08] p-3.5">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-primary-foreground/60">
                      Explanation
                    </p>
                    <p className="text-xs leading-relaxed text-white/75">{reveal.explanation}</p>
                  </div>

                  <button
                    onClick={next}
                    disabled={finishing}
                    className="w-full rounded-xl bg-saffron py-3.5 text-sm font-black text-ink shadow-lg shadow-saffron/20 transition-colors hover:bg-saffron/90 disabled:opacity-60"
                  >
                    {finishing
                      ? "Computing your rank…"
                      : idx + 1 === total
                      ? "Reveal final rank →"
                      : "Next question →"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
