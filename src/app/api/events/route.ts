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
import { guardMutation } from "@/lib/security/guard";
import type { ConversionEventType } from "@/lib/types/database";

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
  const blocked = guardMutation(request, { bucket: "events", limit: 40, windowMs: 60_000 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as {
      eventType?: ConversionEventType;
      ctaLabel?: string;
      meta?: Record<string, unknown>;
      path?: string;
    };

    if (!body.eventType || !VALID_TYPES.includes(body.eventType)) {
      return Response.json({ error: "Invalid eventType" }, { status: 400 });
    }

    const userId = await getStudentId(); // null for anonymous blog readers — still recorded

    await recordEvent({
      id: randomUUID(),
      user_id: userId,
      event_type: body.eventType,
      cta_label: body.ctaLabel?.slice(0, 120) ?? null,
      meta: body.meta ?? {},
      path: body.path?.slice(0, 200) ?? null,
      created_at: new Date().toISOString(),
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to record event" },
      { status: 500 }
    );
  }
}
