/**
 * POST /api/progress/read — mark a short as read for the acting student.
 * Body: { contentItemId: string }
 *
 * Server-side effects: progress row, daily activity, +5 XP (first read
 * only), streak refresh, last_active_at. Identity comes from the session
 * (or the mock user) — never from the body.
 */

import { getStudentId, markShortRead } from "@/lib/student/data";
import { getAllPublishedContent, getContentDate } from "@/lib/content/unified";
import { istToday } from "@/lib/utils/date";
import { guardMutation } from "@/lib/security/guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const blocked = guardMutation(request, { bucket: "progress-read", limit: 60, windowMs: 60_000 });
  if (blocked) return blocked;

  const userId = await getStudentId();
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { contentItemId } = (await request.json()) as { contentItemId?: string };
    if (!contentItemId || typeof contentItemId !== "string") {
      return Response.json({ error: "contentItemId required" }, { status: 400 });
    }

    // Only published content can be marked read
    const published = await getAllPublishedContent();
    const item = published.find((i) => i.id === contentItemId);
    if (!item) {
      return Response.json({ error: "Unknown content item" }, { status: 404 });
    }

    const today = istToday();
    const todayIds = published.filter((i) => getContentDate(i) === today).map((i) => i.id);

    const result = await markShortRead(userId, contentItemId, todayIds);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to record progress" },
      { status: 500 }
    );
  }
}
