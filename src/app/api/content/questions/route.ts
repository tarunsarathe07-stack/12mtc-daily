/**
 * GET /api/content/questions  (public student read)
 *
 * Approved questions for battles — TODAY-FIRST:
 * today's approved current-affairs questions are used before older ones.
 * If today has fewer than requested, the response tops up from the wider
 * approved pool and reports it via `meta` (admin dashboards read this;
 * students just get a full quiz).
 *
 * Query params:
 *   ?topic=legal   — filter by topic
 *   ?count=12      — max questions to return
 *   ?mode=daily    — today-first daily mix (default)
 */

import {
  getDailyQuestionsDetailed,
  getQuestionsByTopic,
} from "@/lib/content/unified";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const topic = url.searchParams.get("topic");
  const count = Math.min(Number(url.searchParams.get("count") || "12"), 20);
  const mode = url.searchParams.get("mode") || "daily";

  if (mode === "topic" && topic) {
    const questions = await getQuestionsByTopic(topic, count);
    return Response.json({ questions, meta: { mode: "topic", topic } });
  }

  const { questions, fromToday, fallbackUsed } = await getDailyQuestionsDetailed(count);
  return Response.json({
    questions,
    meta: { mode: "daily", fromToday, fallbackUsed },
  });
}
