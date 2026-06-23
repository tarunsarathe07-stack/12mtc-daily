/**
 * Streak logic:
 * - Streak increments if user completed >= 1 battle OR read >= 5 shorts today.
 * - Streak resets if yesterday was not streak-qualified.
 */

export function isStreakQualified(
  battlesCompleted: number,
  shortsRead: number
): boolean {
  return battlesCompleted >= 1 || shortsRead >= 5;
}

export function calculateNewStreak(
  currentStreak: number,
  lastStreakDate: string | null,
  todayQualified: boolean
): { newStreak: number; newBest: number; streakBroken: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!todayQualified) {
    return { newStreak: currentStreak, newBest: currentStreak, streakBroken: false };
  }

  if (!lastStreakDate) {
    // First ever streak day
    return { newStreak: 1, newBest: 1, streakBroken: false };
  }

  const lastDate = new Date(lastStreakDate);
  lastDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    // Already counted today
    return { newStreak: currentStreak, newBest: currentStreak, streakBroken: false };
  }

  if (diffDays === 1) {
    // Consecutive day
    const newStreak = currentStreak + 1;
    return {
      newStreak,
      newBest: Math.max(newStreak, currentStreak),
      streakBroken: false,
    };
  }

  // Streak broken — start fresh
  return { newStreak: 1, newBest: currentStreak, streakBroken: true };
}
