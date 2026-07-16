/**
 * POST /api/battle/complete — finalize a fully answered battle.
 * Production completion is one database transaction; client totals and
 * timing never influence the ranked outcome.
 */

import { randomUUID } from "node:crypto";
import {
  getStudentId,
  getQuizSession,
  getSessionAnswers,
  completeQuizSessionAtomically,
  updateQuizSession,
  applyBattleCompletion,
  applyMasteryDeltas,
  recordBattleResult,
  recordEvent,
  getProfile,
  type BattleCompletionSummary,
} from "@/lib/student/data";
import { calculateNewRating } from "@/lib/battle/elo";
import { calculateBattleXP } from "@/lib/gamification/xp";
import { shouldUseSupabaseStore } from "@/lib/content/config";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import {
  readJson,
  routeErrorResponse,
  sameOriginError,
} from "@/lib/security/request";
import {
  createAndPersistBattleResultSummary,
  getCompletedBattleResultSummary,
} from "@/lib/battle/result-summary";

export const runtime = "nodejs";

const BOT_BASE_RATING = 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  const userId = await getStudentId();
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const limited = rateLimitResponse(
    await checkRateLimit(request, {
      bucket: "battle-complete",
      limit: 10,
      windowSeconds: 3600,
      userId,
    })
  );
  if (limited) return limited;

  try {
    const { sessionId } = await readJson<{ sessionId?: string }>(request, 2048);
    if (!sessionId || !UUID_PATTERN.test(sessionId)) {
      return Response.json({ error: "A valid sessionId is required" }, { status: 400 });
    }

    const session = await getQuizSession(sessionId);
    if (!session || session.user_id !== userId) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status === "completed") {
      const completed = await getCompletedBattleResultSummary(sessionId, userId);
      if (completed) return Response.json(completed);
      return Response.json({ error: "Completed result not found" }, { status: 404 });
    }

    const answers = await getSessionAnswers(sessionId);
    if (session.questions.length !== 12 || answers.length !== session.questions.length) {
      return Response.json(
        { error: "All 12 questions must be answered before completing the battle" },
        { status: 409 }
      );
    }

    const summary = shouldUseSupabaseStore()
      ? await completeQuizSessionAtomically(sessionId, userId)
      : await completeLocalBattle(sessionId, userId, session, answers);

    return Response.json(
      await createAndPersistBattleResultSummary(session, userId, summary, answers)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("SESSION_ALREADY_COMPLETED")) {
      return Response.json({ error: "Session already completed" }, { status: 409 });
    }
    if (message.includes("SESSION_INCOMPLETE")) {
      return Response.json(
        { error: "All 12 questions must be answered before completing the battle" },
        { status: 409 }
      );
    }
    if (message.includes("SESSION_NOT_FOUND")) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }
    return routeErrorResponse(error, "Failed to complete battle", "Battle completion failed");
  }
}

async function completeLocalBattle(
  sessionId: string,
  userId: string,
  session: Awaited<ReturnType<typeof getQuizSession>> & {},
  answers: Awaited<ReturnType<typeof getSessionAnswers>>
): Promise<BattleCompletionSummary> {
  const playerScore = answers.reduce((sum, answer) => sum + answer.points, 0);
  const botScore = answers.reduce((sum, answer) => sum + answer.bot_points, 0);
  const correct = answers.filter((answer) => answer.is_correct).length;
  const wrong = answers.filter(
    (answer) => answer.selected_option !== null && !answer.is_correct
  ).length;
  const skipped = answers.filter((answer) => answer.selected_option === null).length;
  const attempted = answers.filter((answer) => answer.time_ms !== null);
  const playerAvgMs = Math.round(
    attempted.length
      ? attempted.reduce((sum, answer) => sum + (answer.time_ms ?? 0), 0) / attempted.length
      : 15000
  );
  const botAvgMs = Math.round(
    answers.reduce((sum, answer) => sum + (answer.bot_time_ms ?? 0), 0) / answers.length
  );

  const winner = playerScore > botScore ? "player1" : playerScore < botScore ? "player2" : "draw";
  const won = winner === "player1";
  const draw = winner === "draw";
  const profileBefore = await getProfile(userId);
  const ratingBefore = profileBefore?.rating ?? 1000;
  const { ratingChange } = calculateNewRating(
    ratingBefore,
    BOT_BASE_RATING,
    won ? 1 : draw ? 0.5 : 0,
    true
  );
  const xpEarned = calculateBattleXP(won, profileBefore?.streak_current ?? 0);

  // Claim first in mock mode so duplicate local requests cannot award twice.
  await updateQuizSession(sessionId, {
    status: "completed",
    player_score: playerScore,
    bot_score: botScore,
    completed_at: new Date().toISOString(),
  });

  const { newRating, newXp, streak } = await applyBattleCompletion(userId, {
    won,
    draw,
    ratingChange,
    xpEarned,
  });

  const perTopic: Record<string, { total: number; correct: number }> = {};
  for (const answer of answers) {
    const topic = answer.topic ?? "polity";
    perTopic[topic] = perTopic[topic] ?? { total: 0, correct: 0 };
    perTopic[topic].total += 1;
    if (answer.is_correct) perTopic[topic].correct += 1;
  }
  await applyMasteryDeltas(userId, perTopic);

  await Promise.all([
    recordBattleResult({
      id: randomUUID(),
      battle_room_id: null,
      quiz_session_id: sessionId,
      user_id: userId,
      is_bot: false,
      bot_profile_name: session.bot_profile.name,
      total_score: playerScore,
      correct_count: correct,
      wrong_count: wrong,
      skipped_count: skipped,
      avg_time_ms: playerAvgMs,
      rating_change: ratingChange,
      xp_earned: xpEarned,
      is_winner: won,
      created_at: new Date().toISOString(),
    }),
    recordEvent({
      id: randomUUID(),
      user_id: userId,
      event_type: "battle_complete",
      cta_label: null,
      meta: { sessionId, won, playerScore, botScore },
      path: "/battle",
      created_at: new Date().toISOString(),
    }),
  ]);

  return {
    winner,
    won,
    draw,
    playerScore,
    botScore,
    correct,
    wrong,
    skipped,
    accuracy: Math.round((correct / answers.length) * 100),
    playerAvgMs,
    botAvgMs,
    ratingBefore,
    ratingChange,
    newRating,
    xpEarned,
    newXp,
    streak,
  };
}
