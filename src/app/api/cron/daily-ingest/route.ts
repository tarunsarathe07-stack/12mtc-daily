/**
 * GET /api/cron/daily-ingest — daily automated pipeline run.
 * Scheduled via vercel.json at 6:00 AM IST (00:30 UTC).
 *
 * Auth (fail closed):
 *   - Vercel Cron: `Authorization: Bearer ${CRON_SECRET}` (Vercel sets this
 *     automatically when the CRON_SECRET env var exists)
 *
 * Generates up to 12 items. By default they land in REVIEW. Set
 * AUTO_PUBLISH_DAILY_INGEST=true to publish quality-passing cards directly.
 */

import { runIngestPipeline } from "@/lib/content/pipeline";
import { isMockMode } from "@/lib/content/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  const viaCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  // Local mock mode with no secrets configured: allow (dev convenience)
  const devOpen = isMockMode() && !cronSecret;

  if (!viaCron && !devOpen) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const autoPublish = process.env.AUTO_PUBLISH_DAILY_INGEST === "true";
    const result = await runIngestPipeline({ limit: 12, dryRun: false, autoPublish });
    return Response.json({ trigger: "cron", ...result });
  } catch (err) {
    console.error("Daily ingest cron failed", err);
    return Response.json(
      { error: "Cron ingest failed" },
      { status: 500 }
    );
  }
}
