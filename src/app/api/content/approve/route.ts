/**
 * POST /api/content/approve  (ADMIN/EDITOR ONLY)
 *
 * Approve, publish, or reject a content item.
 * Body: { id: string, action: "approve" | "publish" | "reject", notes?: string }
 *
 * Flow: review → approved → published  (or review → rejected)
 * - Publishing assigns the next free daily_slot (1-12) for the item's
 *   content_date. Items beyond 12 stay unslotted and show as overflow
 *   in the daily status — nothing is ever deleted.
 * - Approving/publishing also approves the item's linked questions.
 * - Nothing is EVER auto-published; this explicit admin action is the
 *   only path to "published".
 */

import {
  updateContentStatus,
  getContentItemById,
  getQuestionsForContentItem,
  upsertQuestions,
  assignDailySlot,
} from "@/lib/content/data";
import { requireAdmin, adminDenied } from "@/lib/auth/admin-guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return adminDenied(auth);

  try {
    const body = await request.json();
    const { id, action, notes } = body as {
      id: string;
      action: "approve" | "publish" | "reject";
      notes?: string;
    };

    if (!id || !action) {
      return Response.json(
        { error: "Missing required fields: id, action" },
        { status: 400 }
      );
    }

    if (!["approve", "publish", "reject"].includes(action)) {
      return Response.json(
        { error: "Invalid action. Must be: approve, publish, reject" },
        { status: 400 }
      );
    }

    const existing = await getContentItemById(id);
    if (!existing) {
      return Response.json({ error: "Content item not found" }, { status: 404 });
    }

    const statusMap = {
      approve: "approved" as const,
      publish: "published" as const,
      reject: "rejected" as const,
    };
    const newStatus = statusMap[action];

    // Quality gate: publishing requires minimum viable content
    if (action === "publish") {
      const questions = await getQuestionsForContentItem(id);
      const errors: string[] = [];
      if (!existing.why_it_matters) errors.push("missing 'why it matters'");
      if (!existing.source_urls || existing.source_urls.length === 0) errors.push("no source URL");
      if (questions.length === 0) errors.push("no quiz questions");
      if (errors.length > 0) {
        return Response.json(
          { error: `Cannot publish: ${errors.join("; ")}.` },
          { status: 422 }
        );
      }
    }

    let updated = await updateContentStatus(id, newStatus, notes);

    // Publishing → claim a slot in that day's edition of 12
    let dailySlot: number | null = null;
    if (action === "publish" && updated) {
      dailySlot = await assignDailySlot(updated);
      updated = { ...updated, daily_slot: dailySlot };
    }

    // Approving or publishing also approves linked questions
    if (action === "approve" || action === "publish") {
      const questions = await getQuestionsForContentItem(id);
      const updatedQs = questions.map((q) => ({
        ...q,
        status: "approved" as const,
      }));
      if (updatedQs.length > 0) {
        await upsertQuestions(updatedQs);
      }
    }

    return Response.json({
      success: true,
      authVia: auth.via,
      item: updated
        ? {
            id: updated.id,
            title: updated.title,
            status: updated.status,
            content_date: updated.content_date ?? null,
            daily_slot: dailySlot,
          }
        : null,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
      { status: 500 }
    );
  }
}
