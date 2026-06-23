/**
 * GET /api/progress/today — the acting student's habit-loop state.
 * Returns today's read count, streak, XP, rating, league, weak topics,
 * read ids and bookmarks. Backs the Today dashboard.
 */

import {
  getStudentId,
  getProfile,
  getReadContentIds,
  getBookmarkIds,
  getMastery,
  getActiveDates,
} from "@/lib/student/data";
import { getAllPublishedContent, getContentDate } from "@/lib/content/unified";
import { istToday } from "@/lib/utils/date";
import { DAILY_TARGET } from "@/lib/content/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getStudentId();
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const [profile, readIds, bookmarks, mastery, published, activeDates] = await Promise.all([
      getProfile(userId),
      getReadContentIds(userId),
      getBookmarkIds(userId),
      getMastery(userId),
      getAllPublishedContent(),
      getActiveDates(userId),
    ]);

    const today = istToday();
    const todayItems = published.filter((i) => getContentDate(i) === today);
    const readToday = todayItems.filter((i) => readIds.includes(i.id)).length;

    const weakTopics = [...mastery]
      .sort((a, b) => a.mastery_pct - b.mastery_pct)
      .slice(0, 4)
      .map((m) => ({ topic: m.topic, mastery_pct: m.mastery_pct }));

    return Response.json({
      date: today,
      target: DAILY_TARGET,
      todayCount: todayItems.length,
      readToday,
      readIds,
      bookmarks,
      streak: profile?.streak_current ?? 0,
      xp: profile?.xp ?? 0,
      rating: profile?.rating ?? 1000,
      league: profile?.league ?? "bronze",
      weakTopics,
      activeDates,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load progress" },
      { status: 500 }
    );
  }
}
