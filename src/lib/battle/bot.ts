import type { BotProfile, QuestionOption } from "@/lib/types/database";

/**
 * Bot profiles — pre-defined personas with different skill levels.
 * Answers are pre-computed and stored in bot_answer_schedule table.
 */
export const BOT_PROFILES: BotProfile[] = [
  {
    name: "Quick Learner",
    avatar: "/icons/bot-1.png",
    accuracy: 0.6,
    avg_speed_ms: 5000,
  },
  {
    name: "Steady Student",
    avatar: "/icons/bot-2.png",
    accuracy: 0.75,
    avg_speed_ms: 7000,
  },
  {
    name: "Veteran Aspirant",
    avatar: "/icons/bot-3.png",
    accuracy: 0.85,
    avg_speed_ms: 4000,
  },
  {
    name: "CLAT Topper",
    avatar: "/icons/bot-4.png",
    accuracy: 0.92,
    avg_speed_ms: 3000,
  },
];

export function selectBotProfile(playerRating: number): BotProfile {
  // Match bot difficulty to player rating bracket
  if (playerRating < 900) return BOT_PROFILES[0];
  if (playerRating < 1100) return BOT_PROFILES[1];
  if (playerRating < 1300) return BOT_PROFILES[2];
  return BOT_PROFILES[3];
}

/**
 * Generate a bot's answer for a single question.
 * Returns selected option and timing.
 */
export function generateBotAnswer(
  correctOption: string,
  options: QuestionOption[],
  profile: BotProfile
): { selectedOption: string; isCorrect: boolean; delayMs: number } {
  const isCorrectAnswer = Math.random() < profile.accuracy;

  let selectedOption: string;
  if (isCorrectAnswer) {
    selectedOption = correctOption;
  } else {
    // Pick a random wrong answer
    const wrongOptions = options
      .map((o) => o.label)
      .filter((label) => label !== correctOption);
    selectedOption = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
  }

  // Randomize timing around the average speed
  const variance = profile.avg_speed_ms * 0.4;
  const delayMs = Math.max(
    1500,
    Math.round(profile.avg_speed_ms + (Math.random() - 0.5) * 2 * variance)
  );

  return { selectedOption, isCorrect: isCorrectAnswer, delayMs };
}
