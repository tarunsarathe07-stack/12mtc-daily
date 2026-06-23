import type { League } from "@/lib/types/database";

export function getLeagueForXP(xp: number): League {
  if (xp >= 15000) return "diamond";
  if (xp >= 7000) return "platinum";
  if (xp >= 3000) return "gold";
  if (xp >= 1000) return "silver";
  return "bronze";
}

export function getNextLeagueThreshold(currentLeague: League): number | null {
  const thresholds: Record<League, number | null> = {
    bronze: 1000,
    silver: 3000,
    gold: 7000,
    platinum: 15000,
    diamond: null,
  };
  return thresholds[currentLeague];
}
