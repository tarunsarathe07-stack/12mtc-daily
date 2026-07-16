import {
  getBattleResultForQuizSession,
  getMastery,
  getProfile,
  getQuizSession,
  getSessionAnswers,
  saveQuizResultSummary,
  type BattleCompletionSummary,
} from "@/lib/student/data";
import type {
  BattleResultSummary,
  QuizAnswer,
  QuizSession,
} from "@/lib/types/database";

function bestCombo(answers: QuizAnswer[]): number {
  let current = 0;
  let best = 0;
  for (const answer of answers) {
    current = answer.is_correct ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

function reviewFor(session: QuizSession, answers: QuizAnswer[]) {
  return answers.map((answer) => {
    const question = session.questions[answer.question_index];
    return {
      index: answer.question_index,
      prompt: question?.prompt ?? "",
      correctOption: question?.correct_option ?? "",
      correctText:
        question?.options.find((option) => option.label === question.correct_option)?.text ?? "",
      playerOption: answer.selected_option,
      playerCorrect: answer.is_correct,
      botOption: answer.bot_option,
      botCorrect: answer.bot_correct,
    };
  });
}

async function weakTopicsFor(userId: string) {
  const mastery = await getMastery(userId);
  return [...mastery]
    .sort((a, b) => a.mastery_pct - b.mastery_pct)
    .slice(0, 3)
    .map((masteryRow) => ({
      topic: masteryRow.topic,
      mastery_pct: masteryRow.mastery_pct,
    }));
}

export async function createAndPersistBattleResultSummary(
  session: QuizSession,
  userId: string,
  completion: BattleCompletionSummary,
  answers: QuizAnswer[]
): Promise<BattleResultSummary> {
  const summary: BattleResultSummary = {
    sessionId: session.id,
    ...completion,
    bestCombo: bestCombo(answers),
    weakTopics: await weakTopicsFor(userId),
    botName: session.bot_profile.name,
    mode: session.mode,
    topic: session.topic,
    review: reviewFor(session, answers),
  };
  await saveQuizResultSummary(session.id, userId, summary);
  return summary;
}

/** Recover a completed result. The fallback supports battles completed before
 * result snapshots were introduced; all new battles return the exact snapshot. */
export async function getCompletedBattleResultSummary(
  sessionId: string,
  userId: string
): Promise<BattleResultSummary | null> {
  const session = await getQuizSession(sessionId);
  if (!session || session.user_id !== userId || session.status !== "completed") {
    return null;
  }
  if (session.result_summary) {
    return session.result_summary;
  }

  const [answers, result, profile, weakTopics] = await Promise.all([
    getSessionAnswers(sessionId),
    getBattleResultForQuizSession(sessionId, userId),
    getProfile(userId),
    weakTopicsFor(userId),
  ]);
  if (answers.length !== session.questions.length) return null;

  const playerScore = Number(
    session.player_score ?? answers.reduce((sum, answer) => sum + answer.points, 0)
  );
  const botScore = Number(
    session.bot_score ?? answers.reduce((sum, answer) => sum + answer.bot_points, 0)
  );
  const correct = answers.filter((answer) => answer.is_correct).length;
  const wrong = answers.filter(
    (answer) => answer.selected_option !== null && !answer.is_correct
  ).length;
  const skipped = answers.filter((answer) => answer.selected_option === null).length;
  const playerTimes = answers.flatMap((answer) =>
    answer.time_ms === null ? [] : [answer.time_ms]
  );
  const botTimes = answers.flatMap((answer) =>
    answer.bot_time_ms === null ? [] : [answer.bot_time_ms]
  );
  const ratingChange = result?.rating_change ?? 0;
  const newRating = profile?.rating ?? Math.max(0, ratingChange);
  const winner = playerScore > botScore ? "player1" : playerScore < botScore ? "player2" : "draw";

  return {
    sessionId,
    winner,
    won: winner === "player1",
    draw: winner === "draw",
    playerScore,
    botScore,
    correct,
    wrong,
    skipped,
    accuracy: Math.round((correct / answers.length) * 100),
    playerAvgMs: playerTimes.length
      ? Math.round(playerTimes.reduce((sum, time) => sum + time, 0) / playerTimes.length)
      : 15000,
    botAvgMs: botTimes.length
      ? Math.round(botTimes.reduce((sum, time) => sum + time, 0) / botTimes.length)
      : 15000,
    ratingBefore: newRating - ratingChange,
    ratingChange,
    newRating,
    xpEarned: result?.xp_earned ?? 0,
    newXp: profile?.xp ?? 0,
    streak: profile?.streak_current ?? 0,
    bestCombo: bestCombo(answers),
    weakTopics,
    botName: session.bot_profile.name,
    mode: session.mode,
    topic: session.topic,
    review: reviewFor(session, answers),
  };
}
