/**
 * POST /api/bookmarks/toggle — toggle a bookmark for the acting student.
 * Body: { contentItemId: string } → { bookmarked: boolean }
 */

import { getStudentId, toggleBookmark } from "@/lib/student/data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getStudentId();
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { contentItemId } = (await request.json()) as { contentItemId?: string };
    if (!contentItemId) {
      return Response.json({ error: "contentItemId required" }, { status: 400 });
    }
    const bookmarked = await toggleBookmark(userId, contentItemId);
    return Response.json({ bookmarked });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to toggle bookmark" },
      { status: 500 }
    );
  }
}
