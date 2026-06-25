/**
 * Content data facade — single entry point for pipeline/admin data access.
 *
 * Production path:  Supabase Postgres (append-only daily archive).
 * Dev fallback:     local JSON store (data/pipeline-store.json).
 *
 * All functions are async so the two backends are interchangeable.
 * Mutation callers (ingest/approve) and read callers (list/runs/status)
 * import from here — never from store.ts / supabase-store.ts directly.
 */

import { useSupabaseStore, DAILY_TARGET } from "./config";
import * as local from "./store";
import * as supa from "./supabase-store";
import type { ContentItem, Question, TopicTag } from "@/lib/types/database";
import type { PipelineRun } from "./store";
import { istToday } from "@/lib/utils/date";

// ── Content items ──────────────────────────────────

export async function getAllContentItems(): Promise<ContentItem[]> {
  return useSupabaseStore() ? supa.getAllContentItems() : local.getAllContentItems();
}

export async function getContentItemsByStatus(status: string): Promise<ContentItem[]> {
  return useSupabaseStore()
    ? supa.getContentItemsByStatus(status)
    : local.getContentItemsByStatus(status);
}

export async function getPublishedContentItems(): Promise<ContentItem[]> {
  return useSupabaseStore()
    ? supa.getPublishedContentItems()
    : local.getPublishedContentItems();
}

export async function getContentItemById(id: string): Promise<ContentItem | undefined> {
  return useSupabaseStore() ? supa.getContentItemById(id) : local.getContentItemById(id);
}

export async function getContentItemBySlug(slug: string): Promise<ContentItem | undefined> {
  return useSupabaseStore() ? supa.getContentItemBySlug(slug) : local.getContentItemBySlug(slug);
}

export async function upsertContentItems(items: ContentItem[]): Promise<void> {
  return useSupabaseStore() ? supa.upsertContentItems(items) : local.upsertContentItems(items);
}

export async function updateContentStatus(
  id: string,
  status: ContentItem["status"],
  reviewNotes?: string
): Promise<ContentItem | null> {
  return useSupabaseStore()
    ? supa.updateContentStatus(id, status, reviewNotes)
    : local.updateContentStatus(id, status, reviewNotes);
}

export async function isUrlIngested(url: string): Promise<boolean> {
  return useSupabaseStore() ? supa.isUrlIngested(url) : local.isUrlIngested(url);
}

// ── Daily slot assignment (1-12 per IST news day) ──

/**
 * Assign the next free daily_slot (1-12) for the item's content_date.
 * Called when an item is published. Items beyond 12 stay unslotted (null)
 * and are surfaced in the admin daily status — never silently dropped.
 */
export async function assignDailySlot(item: ContentItem): Promise<number | null> {
  const date = item.content_date ?? istToday();
  const published = (await getPublishedContentItems()).filter(
    (i) => (i.content_date ?? "") === date && i.id !== item.id
  );
  const used = new Set(
    published.map((i) => i.daily_slot).filter((s): s is number => typeof s === "number")
  );
  let slot: number | null = null;
  for (let s = 1; s <= DAILY_TARGET; s++) {
    if (!used.has(s)) {
      slot = s;
      break;
    }
  }

  const updated: ContentItem = { ...item, content_date: date, daily_slot: slot };
  if (useSupabaseStore()) {
    await supa.upsertContentItems([updated]);
  } else {
    local.upsertContentItem(updated);
  }
  return slot;
}

// ── Questions ──────────────────────────────────────

export async function getAllQuestions(): Promise<Question[]> {
  return useSupabaseStore() ? supa.getAllQuestions() : local.getAllQuestions();
}

export async function getQuestionsForContentItem(contentItemId: string): Promise<Question[]> {
  return useSupabaseStore()
    ? supa.getQuestionsForContentItem(contentItemId)
    : local.getQuestionsForContentItem(contentItemId);
}

export async function upsertQuestions(questions: Question[]): Promise<void> {
  return useSupabaseStore() ? supa.upsertQuestions(questions) : local.upsertQuestions(questions);
}

// ── Pipeline runs ──────────────────────────────────

export async function addPipelineRun(run: PipelineRun): Promise<void> {
  return useSupabaseStore() ? supa.addPipelineRun(run) : local.addPipelineRun(run);
}

export async function updatePipelineRun(id: string, updates: Partial<PipelineRun>): Promise<void> {
  return useSupabaseStore() ? supa.updatePipelineRun(id, updates) : local.updatePipelineRun(id, updates);
}

export async function getPipelineRuns(): Promise<PipelineRun[]> {
  return useSupabaseStore() ? supa.getPipelineRuns() : local.getPipelineRuns();
}

const PIPELINE_STALE_AFTER_MS = 30 * 60 * 1000;
const STALE_PIPELINE_MESSAGE =
  "Pipeline timed out before completion. Marked failed automatically after 30 minutes so the admin queue does not spin forever.";

function isStalePipelineRun(run: PipelineRun, now = Date.now()): boolean {
  if (run.status !== "running") return false;
  const createdAt = Date.parse(run.created_at);
  if (!Number.isFinite(createdAt)) return false;
  return now - createdAt > PIPELINE_STALE_AFTER_MS;
}

export async function getPipelineRunsWithStaleCleanup(): Promise<{
  runs: PipelineRun[];
  staleFixed: number;
}> {
  const runs = await getPipelineRuns();
  const stale = runs.filter((run) => isStalePipelineRun(run));
  if (stale.length === 0) return { runs, staleFixed: 0 };

  const results = await Promise.allSettled(
    stale.map((run) =>
      updatePipelineRun(run.id, {
        status: "failed",
        error_log: run.error_log
          ? `${run.error_log}
${STALE_PIPELINE_MESSAGE}`
          : STALE_PIPELINE_MESSAGE,
      })
    )
  );

  const staleFixed = results.filter((result) => result.status === "fulfilled").length;
  return {
    runs: staleFixed > 0 ? await getPipelineRuns() : runs,
    staleFixed,
  };
}

// ── Stats & daily status ───────────────────────────

export async function getContentStats() {
  const items = await getAllContentItems();
  return {
    total: items.length,
    review: items.filter((i) => i.status === "review").length,
    approved: items.filter((i) => i.status === "approved").length,
    published: items.filter((i) => i.status === "published").length,
    rejected: items.filter((i) => i.status === "rejected").length,
    draft: items.filter((i) => i.status === "draft").length,
  };
}

export interface DailyStatus {
  date: string; // IST YYYY-MM-DD
  target: number; // 12
  published: number;
  awaitingReview: number;
  approvedNotPublished: number;
  missingSlots: number[];
  overflow: number; // published items without a slot (beyond 12)
  approvedQuestionsToday: number;
  approvedQuestionsTotal: number;
  battleReady: boolean;
  questionFallbackActive: boolean;
  topicMix: Partial<Record<TopicTag, number>>;
  slots: Array<{
    slot: number;
    title: string;
    id: string;
    topicTags: TopicTag[];
    approvedQuestionCount: number;
  } | null>;
}

/** Admin-facing view of how close today's edition is to 12/12. */
export async function getDailyStatus(date?: string): Promise<DailyStatus> {
  const day = date ?? istToday();
  let all = await getAllContentItems();
  let allQuestions = await getAllQuestions();

  // Dev/mock mode: students see mock + pipeline merged, so the admin
  // status must reflect the same merged view (clearly demo data).
  if (!useSupabaseStore()) {
    const { MOCK_CONTENT, MOCK_QUESTIONS } = await import("@/lib/mock-data");
    const ids = new Set(all.map((i) => i.id));
    all = [...all, ...MOCK_CONTENT.filter((i) => !ids.has(i.id))];
    const qIds = new Set(allQuestions.map((q) => q.id));
    allQuestions = [...allQuestions, ...MOCK_QUESTIONS.filter((q) => !qIds.has(q.id))];
  }

  const todays = all.filter((i) => (i.content_date ?? "") === day);

  const published = todays.filter((i) => i.status === "published");
  const slots: DailyStatus["slots"] = Array.from({ length: DAILY_TARGET }, () => null);
  const approvedQuestionsByItem = new Map<string, number>();
  for (const q of allQuestions) {
    if (q.status !== "approved" || !q.content_item_id) continue;
    approvedQuestionsByItem.set(
      q.content_item_id,
      (approvedQuestionsByItem.get(q.content_item_id) ?? 0) + 1
    );
  }

  const topicMix: Partial<Record<TopicTag, number>> = {};
  let overflow = 0;
  for (const item of published) {
    const primaryTopic = item.topic_tags[0];
    if (primaryTopic) {
      topicMix[primaryTopic] = (topicMix[primaryTopic] ?? 0) + 1;
    }
    if (typeof item.daily_slot === "number" && item.daily_slot >= 1 && item.daily_slot <= DAILY_TARGET) {
      slots[item.daily_slot - 1] = {
        slot: item.daily_slot,
        title: item.title,
        id: item.id,
        topicTags: item.topic_tags,
        approvedQuestionCount: approvedQuestionsByItem.get(item.id) ?? 0,
      };
    } else {
      overflow++;
    }
  }
  const missingSlots = slots
    .map((s, idx) => (s === null ? idx + 1 : null))
    .filter((s): s is number => s !== null);

  // Today's approved questions (from published/approved items of this day)
  const todayItemIds = new Set(
    todays.filter((i) => i.status === "published" || i.status === "approved").map((i) => i.id)
  );
  const approvedQuestionsToday = allQuestions.filter(
    (q) =>
      q.status === "approved" && q.content_item_id && todayItemIds.has(q.content_item_id)
  ).length;
  const approvedQuestionsTotal = allQuestions.filter((q) => q.status === "approved").length;

  return {
    date: day,
    target: DAILY_TARGET,
    published: published.length,
    awaitingReview: todays.filter((i) => i.status === "review").length,
    approvedNotPublished: todays.filter((i) => i.status === "approved").length,
    missingSlots,
    overflow,
    approvedQuestionsToday,
    approvedQuestionsTotal,
    battleReady: approvedQuestionsTotal >= DAILY_TARGET,
    questionFallbackActive: approvedQuestionsToday < DAILY_TARGET,
    topicMix,
    slots,
  };
}
