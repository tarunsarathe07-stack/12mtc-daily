/**
 * POST /api/bookmarks/toggle — toggle a bookmark for the acting student.
 * Body: { contentItemId: string } → { bookmarked: boolean }
 */

import { getStudentId, toggleBookmark } from "@/lib/student/data";
import { getAllPublishedContent } from "@/lib/content/unified";
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
      bucket: "bookmark-toggle",
      limit: 60,
      windowSeconds: 60,
      userId,
    })
  );
  if (limited) return limited;

  try {
    const { contentItemId } = await readJson<{ contentItemId?: string }>(request, 2048);
    if (!contentItemId || contentItemId.length > 100) {
      return Response.json({ error: "contentItemId required" }, { status: 400 });
    }
    const published = await getAllPublishedContent();
    if (!published.some((item) => item.id === contentItemId)) {
      return Response.json({ error: "Unknown content item" }, { status: 404 });
    }
    const bookmarked = await toggleBookmark(userId, contentItemId);
    return Response.json({ bookmarked });
  } catch (error) {
    return routeErrorResponse(error, "Failed to toggle bookmark", "Bookmark update failed");
  }
}
