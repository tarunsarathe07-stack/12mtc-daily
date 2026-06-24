/**
 * POST /api/battle/complete — finalize a battle from SERVER-STORED answers.
 * Body: { sessionId }
 *
 * Totals, winner (speed = tiebreaker only), ELO (K=16 vs bot), XP,
 * streak, topic mastery, battle_results and the conversion event are all
 * computed server-side. Client-submitted totals are never accepted.
 */

import { randomUUID } from "crypto";
import {
  getStudentId,
  getQuizSession,
  getSessionAnswers,
  updateQuizSession,
  applyBattleCompletion,
  applyMasteryDeltas,
  recordBattleResult,
  recordEvent,
  getProfile,
  getMastery,
} from "@/lib/student/data";
import { determineWinner } from "@/lib/battle/scoring";
import { calculateNewRating } from "@/lib/battle/elo";
import { calculateBattleXP } from "@/lib/gamification/xp";
import { guardMutation } from "@/lib/security/guard";

export const runtime = "nodejs";

const BOT_BASE_RATING = 1000;

export async function POST(request: Request) {
  const blocked = guardMutation(request, { bucket: "battle-complete", limit: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  const userId = await getStudentId();
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { sessionId } = (await request.json()) as { sessionId?: string };
    if (!sessionId) {
      return Response.json({ error: "sessionId required" }, { status: 400 });
    }

    const session = await getQuizSession(sessionId);
    if (!session || session.user_id !== userId) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status === "completed") {
      return Response.json({ error: "Session already completed" }, { status: 409 });
    }

    const answers = await getSessionAnswers(sessionId);
    if (answers.length === 0) {
      return Response.json({ error: "No answers recorded" }, { status: 409 });
    }

    // ── Totals from server-stored answers only ──
    const playerScore = answers.reduce((s, a) => s + a.points, 0);
    const botScore = answers.reduce((s, a) => s + a.bot_points, 0);
    const correct = answers.filter((a) => a.is_correct).length;
    const wrong = answers.filter((a) => a.selected_option !== null && !a.is_correct).length;
    const skipped = answers.filter((a) => a.selected_option === null).length;
    const attempted = answers.filter((a) => a.time_ms !== null);
    const playerAvgMs =
      attempted.length > 0
        ? attempted.reduce((s, a) => s + (a.time_ms ?? 0), 0) / attempted.length
        : 15000;
    const botAvgMs = answers.reduce((s, a) => s + (a.bot_time_ms ?? 0), 0) / answers.length;

    const winner = determineWinner(playerScore, botScore, playerAvgMs, botAvgMs);
    const won = winner === "player1";
    const draw = winner === "draw";

    // ── ELO + XP (server-side) ──
    const profileBefore = await getProfile(userId);
    const ratingBefore = profileBefore?.rating ?? 1000;
    const { ratingChange } = calculateNewRating(
      ratingBefore,
      BOT_BASE_RATING,
      won ? 1 : draw ? 0.5 : 0,
      true // bot match → K=16
    );
    const xpEarned = calculateBattleXP(won, profileBefore?.streak_current ?? 0);

    const { newRating, newXp, streak } = await applyBattleCompletion(userId, {
      won,
      draw,
      ratingChange,
      xpEarned,
    });

    // ── Topic mastery from this session's answers ──
    const perTopic: Record<string, { total: number; correct: number }> = {};
    for (const a of answers) {
      const t = a.topic ?? "polity";
      perTopic[t] = perTopic[t] ?? { total: 0, correct: 0 };
      perTopic[t].total += 1;
      if (a.is_correct) perTopic[t].correct += 1;
    }
    await applyMasteryDeltas(userId, perTopic);

    // ── Persist results + close session ──
    await updateQuizSession(sessionId, {
      status: "completed",
      player_score: playerScore,
      bot_score: botScore,
      completed_at: new Date().toISOString(),
    });
    await recordBattleResult({
      id: randomUUID(),
      battle_room_id: sessionId,
      user_id: userId,
      is_bot: false,
      bot_profile_name: session.bot_profile.name,
      total_score: playerScore,
      correct_count: correct,
      wrong_count: wrong,
      skipped_count: skipped,
      avg_time_ms: Math.round(playerAvgMs),
      rating_change: ratingChange,
      xp_earned: xpEarned,
      is_winner: won,
      created_at: new Date().toISOString(),
    });
    await recordEvent({
      id: randomUUID(),
      user_id: userId,
      event_type: "battle_complete",
      cta_label: null,
      meta: { sessionId, won, playerScore, botScore },
      path: "/battle",
      created_at: new Date().toISOString(),
    });

    // ── Weak topics (overall, after this battle) ──
    const mastery = await getMastery(userId);
    const weakTopics = [...mastery]
      .sort((a, b) => a.mastery_pct - b.mastery_pct)
      .slice(0, 3)
      .map((m) => ({ topic: m.topic, mastery_pct: m.mastery_pct }));

    const accuracy =
      answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0;

    return Response.json({
      sessionId,
      winner,
      won,
      draw,
      playerScore,
      botScore,
      correct,
      wrong,
      skipped,
      accuracy,
      playerAvgMs: Math.round(playerAvgMs),
      botAvgMs: Math.round(botAvgMs),
      ratingBefore,
      ratingChange,
      newRating,
      xpEarned,
      newXp,
      streak,
      weakTopics,
      botName: session.bot_profile.name,
      mode: session.mode,
      topic: session.topic,
      review: answers.map((a) => {
        const q = session.questions[a.question_index];
        return {
          index: a.question_index,
          prompt: q?.prompt ?? "",
          correctOption: q?.correct_option ?? "",
          correctText: q?.options.find((o) => o.label === q.correct_option)?.text ?? "",
          playerOption: a.selected_option,
          playerCorrect: a.is_correct,
          botOption: a.bot_option,
          botCorrect: a.bot_correct,
        };
      }),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to complete battle" },
      { status: 500 }
    );
  }
}
