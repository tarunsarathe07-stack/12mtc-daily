/**
 * GET /api/content/list  (admin read)
 *
 * Returns all pipeline-generated content items with their questions.
 * Query params:
 *   ?status=review|approved|published|rejected  — filter by status
 */

import {
  getAllContentItems,
  getContentItemsByStatus,
  getQuestionsForContentItem,
  getContentStats,
  getDailyStatus,
} from "@/lib/content/data";
import { requireAdmin, adminDenied } from "@/lib/auth/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return adminDenied(auth);

  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const items = status
    ? await getContentItemsByStatus(status)
    : await getAllContentItems();

  const enriched = await Promise.all(
    items.map(async (item) => ({
      ...item,
      questions: await getQuestionsForContentItem(item.id),
    }))
  );

  const [stats, dailyStatus] = await Promise.all([
    getContentStats(),
    getDailyStatus(),
  ]);

  return Response.json({
    authVia: auth.via,
    stats: { ...stats, todayPublished: dailyStatus.published },
    items: enriched,
  });
}
