/**
 * ELO rating system for CLAT Daily Arena.
 * K-factor = 32 for human matches, 16 for bot matches.
 */

const K_HUMAN = 32;
const K_BOT = 16;

export function calculateExpectedScore(
  playerRating: number,
  opponentRating: number
): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

export function calculateNewRating(
  currentRating: number,
  opponentRating: number,
  actualScore: number, // 1 for win, 0.5 for draw, 0 for loss
  isBotMatch: boolean = false
): { newRating: number; ratingChange: number } {
  const k = isBotMatch ? K_BOT : K_HUMAN;
  const expected = calculateExpectedScore(currentRating, opponentRating);
  const change = Math.round(k * (actualScore - expected));
  return {
    newRating: Math.max(0, currentRating + change),
    ratingChange: change,
  };
}
