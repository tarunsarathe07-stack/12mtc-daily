/**
 * GET /api/content/published  (public student read)
 *
 * Published CURRENT AFFAIRS only (never blog posts).
 * Production: Supabase. Dev: local store + mock merged.
 *
 * Query params:
 *   ?date=YYYY-MM-DD  — only items from that IST news day (archive read)
 *   ?grouped=1        — items grouped by news day (newest first)
 *
 * Every item carries a resolved `content_date` so clients can build
 * Today / Yesterday / Older / All filters. Old days are never erased —
 * the store only appends.
 */

import {
  getAllPublishedContent,
  getContentDate,
  getContentGroupedByDate,
  getContentForDate,
} from "@/lib/content/unified";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const grouped = url.searchParams.get("grouped") === "1";

  if (grouped) {
    return Response.json({ groups: await getContentGroupedByDate() });
  }

  const items = date
    ? await getContentForDate(date)
    : await getAllPublishedContent();

  return Response.json({
    items: items.map((item) => ({
      ...item,
      content_date: getContentDate(item),
    })),
  });
}
