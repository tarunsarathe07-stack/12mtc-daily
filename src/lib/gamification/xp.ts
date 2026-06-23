/**
 * XP awards for various actions.
 */
export const XP_AWARDS = {
  READ_SHORT: 5,
  READ_BLOG: 10,
  COMPLETE_BATTLE: 20,
  WIN_BATTLE: 30,
  STREAK_BONUS_PER_DAY: 10,
  STREAK_BONUS_CAP: 100,
} as const;

export function calculateStreakBonus(streakCount: number): number {
  return Math.min(
    streakCount * XP_AWARDS.STREAK_BONUS_PER_DAY,
    XP_AWARDS.STREAK_BONUS_CAP
  );
}

export function calculateBattleXP(won: boolean, streakCount: number): number {
  let xp = XP_AWARDS.COMPLETE_BATTLE;
  if (won) xp += XP_AWARDS.WIN_BATTLE;
  xp += calculateStreakBonus(streakCount);
  return xp;
}
