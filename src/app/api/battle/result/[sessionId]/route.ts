import { getCompletedBattleResultSummary } from "@/lib/battle/result-summary";
import { getStudentId } from "@/lib/student/data";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { routeErrorResponse } from "@/lib/security/request";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const userId = await getStudentId();
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const limited = rateLimitResponse(
    await checkRateLimit(request, {
      bucket: "battle-result",
      limit: 60,
      windowSeconds: 3600,
      userId,
    })
  );
  if (limited) return limited;

  try {
    const { sessionId } = await params;
    if (!UUID_PATTERN.test(sessionId)) {
      return Response.json({ error: "A valid sessionId is required" }, { status: 400 });
    }
    const summary = await getCompletedBattleResultSummary(sessionId, userId);
    if (!summary) {
      return Response.json({ error: "Result not found" }, { status: 404 });
    }
    return Response.json(summary, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return routeErrorResponse(error, "Failed to load battle result", "Battle result lookup failed");
  }
}
