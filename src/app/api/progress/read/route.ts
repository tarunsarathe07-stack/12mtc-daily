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
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { readJson, routeErrorResponse, sameOriginError } from "@/lib/security/request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  const userId = await getStudentId();
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const limited = rateLimitResponse(
    await checkRateLimit(request, {
      bucket: "progress-read",
      limit: 60,
      windowSeconds: 60,
      userId,
    })
  );
  if (limited) return limited;

  try {
    const { contentItemId } = await readJson<{ contentItemId?: string }>(request, 2048);
    if (!contentItemId || typeof contentItemId !== "string" || contentItemId.length > 100) {
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
  } catch (error) {
    return routeErrorResponse(error, "Failed to record progress", "Progress update failed");
  }
}
