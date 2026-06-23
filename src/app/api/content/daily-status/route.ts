/**
 * GET /api/content/daily-status  (admin visibility)
 *
 * How close is a day's edition to 12/12?
 * Query params:
 *   ?date=YYYY-MM-DD  — defaults to today (Asia/Kolkata)
 *
 * Reports published count, missing slots, items awaiting review,
 * approved question count, and whether battles are currently falling
 * back to older questions. The fallback is visible HERE, not in
 * student UX.
 */

import { getDailyStatus } from "@/lib/content/data";
import { requireAdmin, adminDenied } from "@/lib/auth/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return adminDenied(auth);

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? undefined;
  const status = await getDailyStatus(date);
  return Response.json({ ...status, authVia: auth.via });
}
