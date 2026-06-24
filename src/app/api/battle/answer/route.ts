/**
 * POST /api/battle/answer — submit one answer; server scores it.
 * Body: { sessionId, questionIndex, selectedOption: "A"-"D" | null, timeMs }
 *
 * Validation:
 *   - session must exist, belong to the acting student, and be active
 *   - one answer per question (replay-protected)
 *   - option must be a label of that question or null (skip)
 *   - timeMs clamped to [0, 15000]
 *
 * Returns the reveal: correct option, explanation, both players' points.
 * CLAT scoring: +1 / −0.25 / 0. No speed bonus.
 */

import { randomUUID } from "crypto";
import {
  getStudentId,
  getQuizSession,
  getSessionAnswers,
  addQuizAnswer,
} from "@/lib/student/data";
import { calculatePoints, isCorrect } from "@/lib/battle/scoring";
import { guardMutation } from "@/lib/security/guard";

export const runtime = "nodejs";

const MAX_TIME_MS = 15000;

export async function POST(request: Request) {
  // Bursty by nature (one call per question), but 60/min/IP is well above any
  // human pace and still throttles a script hammering the endpoint.
  const blocked = guardMutation(request, { bucket: "battle-answer", limit: 60, windowMs: 60_000 });
  if (blocked) return blocked;

  const userId = await getStudentId();
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      sessionId?: string;
      questionIndex?: number;
      selectedOption?: string | null;
      timeMs?: number;
    };

    const { sessionId } = body;
    const questionIndex = Number(body.questionIndex);
    if (!sessionId || !Number.isInteger(questionIndex) || questionIndex < 0) {
      return Response.json({ error: "sessionId and questionIndex required" }, { status: 400 });
    }

    const session = await getQuizSession(sessionId);
    if (!session || session.user_id !== userId) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status !== "active") {
      return Response.json({ error: "Session is not active" }, { status: 409 });
    }

    const question = session.questions[questionIndex];
    if (!question) {
      return Response.json({ error: "Invalid question index" }, { status: 400 });
    }

    // Validate the option against this question's labels (or null = skip)
    const validLabels = question.options.map((o) => o.label);
    const selected =
      body.selectedOption === null || body.selectedOption === undefined
        ? null
        : String(body.selectedOption);
    if (selected !== null && !validLabels.includes(selected)) {
      return Response.json({ error: "Invalid option" }, { status: 400 });
    }

    const timeMs = Math.max(0, Math.min(Number(body.timeMs) || 0, MAX_TIME_MS));

    // Server computes both sides — client never submits points
    const bot = session.bot_answers[questionIndex];
    const playerPoints = calculatePoints(selected, question.correct_option);
    const botPoints = calculatePoints(bot.selectedOption, question.correct_option);

    await addQuizAnswer({
      id: randomUUID(),
      session_id: sessionId,
      user_id: userId,
      question_id: question.id,
      question_index: questionIndex,
      selected_option: selected,
      is_correct: isCorrect(selected, question.correct_option),
      points: playerPoints,
      time_ms: selected === null ? null : timeMs,
      bot_option: bot.selectedOption,
      bot_correct: bot.isCorrect,
      bot_points: botPoints,
      bot_time_ms: bot.delayMs,
      topic: question.topic,
      created_at: new Date().toISOString(),
    });

    const answers = await getSessionAnswers(sessionId);
    const playerTotal = answers.reduce((s, a) => s + a.points, 0);
    const botTotal = answers.reduce((s, a) => s + a.bot_points, 0);

    return Response.json({
      correctOption: question.correct_option,
      explanation: question.explanation,
      playerPoints,
      playerCorrect: isCorrect(selected, question.correct_option),
      botOption: bot.selectedOption,
      botCorrect: bot.isCorrect,
      botPoints,
      botTimeMs: bot.delayMs,
      totals: { player: playerTotal, bot: botTotal },
      answered: answers.length,
      totalQuestions: session.questions.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit answer";
    const status = message.includes("already answered") || message.includes("duplicate") ? 409 : 500;
    return Response.json({ error: message }, { status });
  }
}
