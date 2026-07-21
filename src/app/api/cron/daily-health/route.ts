/**
 * GET /api/cron/daily-health — post-ingest verification and recovery.
 * Scheduled for 7:00 AM IST, one hour after the primary ingest.
 */

import { runIngestPipeline } from "@/lib/content/pipeline";
import { backfillQuestionSetsForDate } from "@/lib/content/question-backfill";
import { getDailyStatus } from "@/lib/content/data";
import { isMockMode } from "@/lib/content/config";
import { istToday } from "@/lib/utils/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function editionHealthy(status: Awaited<ReturnType<typeof getDailyStatus>>) {
  return (
    status.published >= status.target &&
    status.missingSlots.length === 0 &&
    status.cardsWithDailyNewsQuestion >= status.target &&
    status.cardsWithContextQuestions >= status.target
  );
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const viaCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;
  const devOpen = isMockMode() && !cronSecret;

  if (!viaCron && !devOpen) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = istToday();
  try {
    const before = await getDailyStatus(date);
    let ingest: Awaited<ReturnType<typeof runIngestPipeline>> | null = null;

    if (before.missingSlots.length > 0) {
      if (process.env.AUTO_PUBLISH_DAILY_INGEST !== "true") {
        return Response.json(
          { error: "Daily recovery requires AUTO_PUBLISH_DAILY_INGEST=true", before },
          { status: 503 }
        );
      }
      ingest = await runIngestPipeline({ limit: 12, dryRun: false, autoPublish: true });
    }

    const questionBackfill = await backfillQuestionSetsForDate(date);
    const after = await getDailyStatus(date);
    const healthy = editionHealthy(after);

    if (!healthy) {
      console.error("Daily edition health check failed", {
        date,
        missingSlots: after.missingSlots,
        cardsWithDailyNewsQuestion: after.cardsWithDailyNewsQuestion,
        cardsWithContextQuestions: after.cardsWithContextQuestions,
        errors: [...(ingest?.errors ?? []), ...questionBackfill.errors],
      });
    }

    return Response.json(
      { trigger: "daily-health", healthy, before, ingest, questionBackfill, after },
      { status: healthy ? 200 : 500 }
    );
  } catch (error) {
    console.error("Daily edition health check crashed", error);
    return Response.json({ error: "Daily health check failed" }, { status: 500 });
  }
}
