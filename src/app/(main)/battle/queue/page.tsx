"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Bot, User, AlertTriangle } from "lucide-react";
import Link from "next/link";

/**
 * Matchmaking queue → server-authoritative session.
 * While the radar spins, we create the battle session on the server.
 * The session payload (questions WITHOUT answers) is handed to the
 * battle room via sessionStorage.
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

export default function QueuePage() {
  return (
    <Suspense fallback={<QueueLoading />}>
      <QueueContent />
    </Suspense>
  );
}

function QueueLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

const MIN_SEARCH_MS = 2600; // a little drama before the bot "appears"

function QueueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") || "daily";
  const topic = searchParams.get("topic");

  const [phase, setPhase] = useState<"searching" | "found" | "countdown" | "error">("searching");
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [timed, setTimed] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [questionReadiness, setQuestionReadiness] = useState<{
    available: number;
    required: number;
  } | null>(null);
  // Create the server session while "searching"
  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    async function createSession() {
      try {
        const res = await fetch("/api/battle/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode, topic }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setErrorMsg(data.error || "Could not start a battle");
          if (
            typeof data.availableQuestions === "number" &&
            typeof data.requiredQuestions === "number"
          ) {
            setQuestionReadiness({
              available: data.availableQuestions,
              required: data.requiredQuestions,
            });
          }
          setPhase("error");
          return;
        }
        const wait = Math.max(0, MIN_SEARCH_MS - (Date.now() - startedAt));
        setTimeout(() => {
          if (cancelled) return;
          setSession(data as SessionPayload);
          setPhase("found");
        }, wait);
      } catch {
        if (!cancelled) {
          setErrorMsg("Network error — try again");
          setPhase("error");
        }
      }
    }
    createSession();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The countdown only starts after the student explicitly confirms readiness.
  useEffect(() => {
    if (phase !== "countdown" || !session) return;
    if (countdown === 0) {
      const readySession = {
        ...session,
        timePerQuestionSec: timed ? session.timePerQuestionSec : 0,
      };
      sessionStorage.setItem(`tmd-battle-${session.sessionId}`, JSON.stringify(readySession));
      router.push(`/battle/${session.sessionId}`);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [phase, countdown, session, timed, router]);

  return (
    <div className="dark-surface bg-ink relative -mb-20 flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 text-white lg:-mb-8">
      <div className="relative z-10 w-full max-w-sm space-y-8 text-center">
        <AnimatePresence mode="wait">
          {phase === "searching" && (
            <motion.div key="search" exit={{ opacity: 0, scale: 0.9 }} className="space-y-8">
              {/* Radar */}
              <div className="relative mx-auto h-28 w-28">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-saffron/45"
                    animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6 }}
                  />
                ))}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
                  <Swords className="h-10 w-10 text-saffron" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">Finding your opponent…</h2>
                <p className="mt-1 text-sm text-white/50">
                  {mode === "topic" && topic
                    ? `Topic duel: ${topic.charAt(0).toUpperCase() + topic.slice(1)}`
                    : "Daily battle · 12 questions · CLAT scoring"}
                </p>
              </div>
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-brand-gradient flex h-14 w-14 items-center justify-center rounded-full ">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold">You</span>
                </div>
                <span className="text-xl font-black text-white/40">VS</span>
                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-white/20 bg-white/5"
                  >
                    <span className="text-2xl">?</span>
                  </motion.div>
                  <span className="text-xs text-white/50">Searching…</span>
                </div>
              </div>
            </motion.div>
          )}

          {(phase === "found" || phase === "countdown") && session && (
            <motion.div
              key="found"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 14 }}
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-saffron/15 ring-4 ring-saffron/30"
              >
                <Bot className="h-11 w-11 text-saffron" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold">Opponent found!</h2>
                <p className="mt-1 text-sm text-white/50">
                  You&apos;re facing <span className="font-semibold text-white">{session.bot.name}</span> 🤖
                </p>
              </div>
              {phase === "found" && (
                <div className="space-y-4">
                  <label className="mx-auto flex max-w-xs cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left">
                    <span>
                      <span className="block text-sm font-bold text-white">15-second timer</span>
                      <span className="block text-xs text-white/50">Turn it off for untimed practice.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={timed}
                      onChange={(event) => setTimed(event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="relative h-6 w-11 rounded-full bg-white/15 transition peer-checked:bg-saffron after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCountdown(3);
                      setPhase("countdown");
                    }}
                    className="w-full rounded-lg bg-saffron px-6 py-3 text-sm font-bold text-ink shadow-lg shadow-saffron/20 hover:bg-saffron/90"
                  >
                    I&apos;m ready — start quiz
                  </button>
                </div>
              )}
              {phase === "countdown" && (
                <motion.div
                  key={countdown}
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-7xl font-black tabular-nums text-white"
                >
                  {countdown === 0 ? "GO!" : countdown}
                </motion.div>
              )}
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-saffron-soft">
                <AlertTriangle className="h-9 w-9 text-saffron" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Quiz battle is not ready yet</h2>
                <p className="mt-1 text-sm text-white/55">{errorMsg}</p>
                {questionReadiness && (
                  <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
                    {questionReadiness.available}/{questionReadiness.required} approved questions ready
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/shorts"
                  className="inline-block rounded-lg bg-saffron px-6 py-2.5 text-sm font-semibold text-ink"
                >
                  Read today&apos;s 12
                </Link>
                <Link
                  href="/battle"
                  className="inline-block rounded-lg border border-white/15 px-6 py-2.5 text-sm font-semibold text-white"
                >
                  Back to quiz lobby
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
