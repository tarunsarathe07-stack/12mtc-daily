/**
 * CLAT-aligned scoring: +1 correct, -0.25 wrong, 0 skipped/timeout.
 * No speed bonus in ranked mode. Speed used only as tiebreaker.
 */

export const POINTS = {
  CORRECT: 1.0,
  WRONG: -0.25,
  SKIPPED: 0,
} as const;

export function calculatePoints(
  selectedOption: string | null,
  correctOption: string
): number {
  if (selectedOption === null) return POINTS.SKIPPED;
  if (selectedOption === correctOption) return POINTS.CORRECT;
  return POINTS.WRONG;
}

export function isCorrect(
  selectedOption: string | null,
  correctOption: string
): boolean {
  return selectedOption !== null && selectedOption === correctOption;
}

/**
 * Determine winner by score, then by avg speed as tiebreaker.
 */
export function determineWinner(
  player1Score: number,
  player2Score: number,
  player1AvgMs: number,
  player2AvgMs: number
): "player1" | "player2" | "draw" {
  if (player1Score > player2Score) return "player1";
  if (player2Score > player1Score) return "player2";
  // Tiebreaker: faster average wins
  if (player1AvgMs < player2AvgMs) return "player1";
  if (player2AvgMs < player1AvgMs) return "player2";
  return "draw";
}
