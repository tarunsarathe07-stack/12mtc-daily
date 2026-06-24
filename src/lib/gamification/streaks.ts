/**
 * Streak logic:
 * - Streak increments if user completed >= 1 battle OR read >= 5 shorts today.
 * - Streak resets if yesterday was not streak-qualified, UNLESS the student
 *   has enough streak freezes banked to cover the missed day(s).
 */

/** Max freezes a student can hold at once. */
export const MAX_STREAK_FREEZES = 2;

export function isStreakQualified(
  battlesCompleted: number,
  shortsRead: number
): boolean {
  return battlesCompleted >= 1 || shortsRead >= 5;
}

export interface StreakResult {
  newStreak: number;
  newBest: number;
  streakBroken: boolean;
  /** Freezes consumed to bridge a gap (0 unless a missed day was covered). */
  freezesUsed: number;
}

export function calculateNewStreak(
  currentStreak: number,
  lastStreakDate: string | null,
  todayQualified: boolean,
  availableFreezes = 0
): StreakResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!todayQualified) {
    return { newStreak: currentStreak, newBest: currentStreak, streakBroken: false, freezesUsed: 0 };
  }

  if (!lastStreakDate) {
    // First ever streak day
    return { newStreak: 1, newBest: 1, streakBroken: false, freezesUsed: 0 };
  }

  const lastDate = new Date(lastStreakDate);
  lastDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    // Already counted today
    return { newStreak: currentStreak, newBest: currentStreak, streakBroken: false, freezesUsed: 0 };
  }

  if (diffDays === 1) {
    // Consecutive day
    const newStreak = currentStreak + 1;
    return {
      newStreak,
      newBest: Math.max(newStreak, currentStreak),
      streakBroken: false,
      freezesUsed: 0,
    };
  }

  // Gap of 2+ days. Spend banked freezes to cover the missed day(s) and keep
  // the streak alive. With availableFreezes = 0 (the default for everyone),
  // this is identical to the previous "reset to 1" behavior.
  const missedDays = diffDays - 1;
  if (availableFreezes >= missedDays) {
    const newStreak = currentStreak + 1;
    return {
      newStreak,
      newBest: Math.max(newStreak, currentStreak),
      streakBroken: false,
      freezesUsed: missedDays,
    };
  }

  // Not enough freezes — streak broken, start fresh
  return { newStreak: 1, newBest: currentStreak, streakBroken: true, freezesUsed: 0 };
}
