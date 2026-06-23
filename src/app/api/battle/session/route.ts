/**
 * POST /api/battle/session — start a server-authoritative bot battle.
 * Body: { mode?: "daily" | "topic", topic?: string }
 *
 * The server:
 *   1. Picks 12 questions (today-first for daily mode)
 *   2. Snapshots them WITH correct answers into the session (server-only)
 *   3. Selects a bot matched to the player's rating and pre-computes
 *      its full answer plan
 *   4. Returns questions WITHOUT correct_option/explanation
 *
 * The client can only submit one answer per question via /api/battle/answer;
 * all scoring happens server-side.
 */

import { randomUUID } from "crypto";
import { getStudentId, getProfile, createQuizSession } from "@/lib/student/data";
import { getDailyQuestionsDetailed, getQuestionsByTopic } from "@/lib/content/unified";
import { selectBotProfile, generateBotAnswer } from "@/lib/battle/bot";
import type { QuizSession } from "@/lib/types/database";

export const runtime = "nodejs";

const QUESTIONS_PER_ROUND = 12;
const TIME_PER_QUESTION_SEC = 15;

export async function POST(request: Request) {
  const userId = await getStudentId();
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      mode?: string;
      topic?: string;
    };
    const mode = body.mode === "topic" ? "topic" : "daily";
    const topic = mode === "topic" ? (body.topic ?? null) : null;

    // 1. Server picks the questions
    const questions =
      mode === "topic" && topic
        ? await getQuestionsByTopic(topic, QUESTIONS_PER_ROUND)
        : (await getDailyQuestionsDetailed(QUESTIONS_PER_ROUND)).questions;

    if (questions.length < QUESTIONS_PER_ROUND) {
      return Response.json(
        {
          error:
            "Today’s 12-question quiz is still being prepared. Please approve/publish more reviewed questions.",
          availableQuestions: questions.length,
          requiredQuestions: QUESTIONS_PER_ROUND,
        },
        { status: 409 }
      );
    }

    // 2-3. Bot matched to rating + full pre-computed plan
    const profile = await getProfile(userId);
    const botProfile = selectBotProfile(profile?.rating ?? 1000);
    const botAnswers = questions.map((q) =>
      generateBotAnswer(q.correct_option, q.options, botProfile)
    );

    const session: QuizSession = {
      id: randomUUID(),
      user_id: userId,
      mode,
      topic,
      bot_profile: botProfile,
      questions, // full snapshot — stays server-side
      bot_answers: botAnswers,
      status: "active",
      player_score: null,
      bot_score: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    await createQuizSession(session);

    // 4. Client payload: questions stripped of answers; bot delays only
    return Response.json({
      sessionId: session.id,
      mode,
      topic,
      timePerQuestionSec: TIME_PER_QUESTION_SEC,
      bot: { name: botProfile.name, avatar: botProfile.avatar },
      botDelaysMs: botAnswers.map((b) => b.delayMs),
      questions: questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
        topic: q.topic,
        difficulty: q.difficulty,
      })),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to start battle" },
      { status: 500 }
    );
  }
}
