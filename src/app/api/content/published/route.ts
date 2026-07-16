/**
 * GET /api/content/published  (public student read)
 *
 * Published CURRENT AFFAIRS only (never blog posts).
 * Production: Supabase. Dev: local store + mock merged.
 *
 * Query params:
 *   ?date=YYYY-MM-DD  — only items from that IST news day (archive read)
 *   ?grouped=1        — items grouped by news day (newest first)
 *   ?page=1&limit=24  — bounded archive page (default)
 *   ?all=1            — full archive for the Shorts experience
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
  getPublishedContentPage,
} from "@/lib/content/unified";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;
const MAX_GROUPED_DAYS = 30;

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const grouped = url.searchParams.get("grouped") === "1";
  const all = url.searchParams.get("all") === "1";
  const page = parsePositiveInt(url.searchParams.get("page"), 1, 10_000);
  const limit = parsePositiveInt(
    url.searchParams.get("limit"),
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
  );
  if (date && !/^20\d{2}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  if (grouped) {
    const days = parsePositiveInt(
      url.searchParams.get("days"),
      MAX_GROUPED_DAYS,
      MAX_GROUPED_DAYS
    );
    return Response.json(
      { groups: await getContentGroupedByDate(days), days },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  }

  if (date) {
    const items = await getContentForDate(date);
    return Response.json(
      {
        items: items.map((item) => ({ ...item, content_date: getContentDate(item) })),
        pagination: { page: 1, limit: items.length, total: items.length, hasMore: false },
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  }

  if (all) {
    const items = await getAllPublishedContent();
    return Response.json(
      {
        items: items.map((item) => ({ ...item, content_date: getContentDate(item) })),
        pagination: { page: 1, limit: items.length, total: items.length, hasMore: false },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const { items, total } = await getPublishedContentPage(page, limit);

  return Response.json(
    {
      items: items.map((item) => ({
        ...item,
        content_date: getContentDate(item),
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
