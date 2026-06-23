/**
 * GET /api/cron/daily-ingest — daily automated pipeline run.
 * Scheduled via vercel.json at 6:00 AM IST (00:30 UTC).
 *
 * Auth (fail closed):
 *   - Vercel Cron: `Authorization: Bearer ${CRON_SECRET}` (Vercel sets this
 *     automatically when the CRON_SECRET env var exists)
 *   - Manual/external schedulers: `x-admin-key: ADMIN_DEV_KEY`
 *
 * Generates up to 12 items into the REVIEW queue. Nothing auto-publishes —
 * an admin approves the day's 12 in /admin/content.
 */

import { runIngestPipeline } from "@/lib/content/pipeline";
import { isMockMode } from "@/lib/content/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const adminKey = process.env.ADMIN_DEV_KEY;
  const authHeader = request.headers.get("authorization");
  const adminHeader = request.headers.get("x-admin-key");

  const viaCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;
  const viaKey = !!adminKey && adminHeader === adminKey;

  // Local mock mode with no secrets configured: allow (dev convenience)
  const devOpen = isMockMode() && !cronSecret && !adminKey;

  if (!viaCron && !viaKey && !devOpen) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runIngestPipeline({ limit: 12, dryRun: false });
    return Response.json({ trigger: "cron", ...result });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Cron ingest failed" },
      { status: 500 }
    );
  }
}
