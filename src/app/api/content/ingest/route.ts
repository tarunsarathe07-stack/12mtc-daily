/**
 * POST /api/content/ingest  (ADMIN/EDITOR ONLY)
 *
 * Manually trigger the content pipeline. The pipeline itself lives in
 * @/lib/content/pipeline (shared with the daily cron).
 *
 * Query params:
 *   ?limit=N   — max items to process (default 12, capped at 12)
 *   ?dryRun=1  — RSS discovery + scoring only, no Claude calls
 */

import { runIngestPipeline } from "@/lib/content/pipeline";
import { requireAdmin, adminDenied } from "@/lib/auth/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — sequential Claude calls for up to 12 articles

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return adminDenied(auth);

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || "12");
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const result = await runIngestPipeline({ limit, dryRun });
    return Response.json(result);
  } catch (err) {
    const status =
      err && typeof err === "object" && "statusCode" in err
        ? (err.statusCode as number)
        : 500;
    return Response.json(
      { error: err instanceof Error ? err.message : "Pipeline failed" },
      { status }
    );
  }
}
