/**
 * POST /api/events — record a conversion/funnel event.
 * Body: { eventType, ctaLabel?, meta?, path? }
 *
 * Event types: read_12_complete | battle_complete | weak_topic_shown |
 *              blog_cta_click | profile_cta_click
 */

import { randomUUID } from "crypto";
import { getStudentId, recordEvent, getRecentEvents } from "@/lib/student/data";
import { requireAdmin, adminDenied } from "@/lib/auth/admin-guard";
import type { ConversionEventType } from "@/lib/types/database";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { readJson, routeErrorResponse, sameOriginError } from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/events — recent events + counts by type (ADMIN ONLY). */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return adminDenied(auth);

  const events = await getRecentEvents(200);
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
  }
  return Response.json({ counts, events });
}

const VALID_TYPES: ConversionEventType[] = [
  "read_12_complete",
  "battle_complete",
  "weak_topic_shown",
  "blog_cta_click",
  "profile_cta_click",
];

export async function POST(request: Request) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  const limited = rateLimitResponse(
    await checkRateLimit(request, {
      bucket: "conversion-event",
      limit: 30,
      windowSeconds: 60,
    })
  );
  if (limited) return limited;

  try {
    const body = await readJson<{
      eventType?: ConversionEventType;
      ctaLabel?: string;
      meta?: Record<string, unknown>;
      path?: string;
    }>(request, 4096);

    if (!body.eventType || !VALID_TYPES.includes(body.eventType)) {
      return Response.json({ error: "Invalid eventType" }, { status: 400 });
    }

    const userId = await getStudentId(); // null for anonymous blog readers — still recorded

    await recordEvent({
      id: randomUUID(),
      user_id: userId,
      event_type: body.eventType,
      cta_label: body.ctaLabel?.slice(0, 120) ?? null,
      meta: sanitizeMeta(body.meta),
      path: body.path?.slice(0, 200) ?? null,
      created_at: new Date().toISOString(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return routeErrorResponse(error, "Failed to record event", "Conversion event write failed");
  }
}

function sanitizeMeta(meta: Record<string, unknown> | undefined): Record<string, string | number | boolean | null> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(meta).slice(0, 10)) {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    if (!safeKey) continue;
    if (typeof value === "string") safe[safeKey] = value.slice(0, 200);
    else if (typeof value === "number" && Number.isFinite(value)) safe[safeKey] = value;
    else if (typeof value === "boolean" || value === null) safe[safeKey] = value;
  }
  return safe;
}
