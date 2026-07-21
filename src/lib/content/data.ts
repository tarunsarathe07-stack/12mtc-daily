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

import { shouldUseSupabaseStore, DAILY_TARGET } from "./config";
import * as local from "./store";
import * as supa from "./supabase-store";
import type { ContentItem, Question, TopicTag } from "@/lib/types/database";
import type { PipelineRun } from "./store";
import { istToday } from "@/lib/utils/date";
import { isStudentReadyContextQuestion } from "./question-version";

// ── Content items ──────────────────────────────────

export async function getAllContentItems(): Promise<ContentItem[]> {
  return shouldUseSupabaseStore() ? supa.getAllContentItems() : local.getAllContentItems();
}

export async function getContentItemsByStatus(status: string): Promise<ContentItem[]> {
  return shouldUseSupabaseStore()
    ? supa.getContentItemsByStatus(status)
    : local.getContentItemsByStatus(status);
}

export async function getPublishedContentItems(): Promise<ContentItem[]> {
  return shouldUseSupabaseStore()
    ? supa.getPublishedContentItems()
    : local.getPublishedContentItems();
}

export async function getPublishedContentByDate(date: string): Promise<ContentItem[]> {
  return shouldUseSupabaseStore()
    ? supa.getPublishedContentByDate(date)
    : local.getPublishedContentByDate(date);
}

export async function getPublishedContentPage(
  offset: number,
  limit: number
): Promise<{ items: ContentItem[]; total: number }> {
  return shouldUseSupabaseStore()
    ? supa.getPublishedContentPage(offset, limit)
    : local.getPublishedContentPage(offset, limit);
}

export async function getContentItemById(id: string): Promise<ContentItem | undefined> {
  return shouldUseSupabaseStore() ? supa.getContentItemById(id) : local.getContentItemById(id);
}

export async function getContentItemBySlug(slug: string): Promise<ContentItem | undefined> {
  return shouldUseSupabaseStore() ? supa.getContentItemBySlug(slug) : local.getContentItemBySlug(slug);
}

export async function upsertContentItems(items: ContentItem[]): Promise<void> {
  return shouldUseSupabaseStore() ? supa.upsertContentItems(items) : local.upsertContentItems(items);
}

export async function updateContentStatus(
  id: string,
  status: ContentItem["status"],
  reviewNotes?: string
): Promise<ContentItem | null> {
  return shouldUseSupabaseStore()
    ? supa.updateContentStatus(id, status, reviewNotes)
    : local.updateContentStatus(id, status, reviewNotes);
}

export async function isUrlIngested(url: string): Promise<boolean> {
  return shouldUseSupabaseStore() ? supa.isUrlIngested(url) : local.isUrlIngested(url);
}

// ── Daily slot assignment (1-12 per IST news day) ──

/**
 * Assign the next free daily_slot (1-12) for the item's content_date.
 * Called when an item is published. Items beyond 12 stay unslotted (null)
 * and are surfaced in the admin daily status — never silently dropped.
 */
export async function assignDailySlot(item: ContentItem): Promise<number | null> {
  const date = item.content_date ?? istToday();
  const published = (await getPublishedContentByDate(date)).filter((i) => i.id !== item.id);
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
  if (shouldUseSupabaseStore()) {
    await supa.upsertContentItems([updated]);
  } else {
    local.upsertContentItem(updated);
  }
  return slot;
}

// ── Questions ──────────────────────────────────────

export async function getAllQuestions(): Promise<Question[]> {
  return shouldUseSupabaseStore() ? supa.getAllQuestions() : local.getAllQuestions();
}

export async function getQuestionsForContentItem(contentItemId: string): Promise<Question[]> {
  return shouldUseSupabaseStore()
    ? supa.getQuestionsForContentItem(contentItemId)
    : local.getQuestionsForContentItem(contentItemId);
}

export async function upsertQuestions(questions: Question[]): Promise<void> {
  return shouldUseSupabaseStore() ? supa.upsertQuestions(questions) : local.upsertQuestions(questions);
}

// ── Pipeline runs ──────────────────────────────────

export async function addPipelineRun(run: PipelineRun): Promise<void> {
  return shouldUseSupabaseStore() ? supa.addPipelineRun(run) : local.addPipelineRun(run);
}

export async function updatePipelineRun(id: string, updates: Partial<PipelineRun>): Promise<void> {
  return shouldUseSupabaseStore() ? supa.updatePipelineRun(id, updates) : local.updatePipelineRun(id, updates);
}

export async function getPipelineRuns(limit = 50): Promise<PipelineRun[]> {
  return shouldUseSupabaseStore() ? supa.getPipelineRuns(limit) : local.getPipelineRuns(limit);
}

const PIPELINE_STALE_AFTER_MS = 30 * 60 * 1000;
const STALE_PIPELINE_MESSAGE =
  "Pipeline timed out before completion. Marked failed automatically after 30 minutes so the admin queue does not spin forever.";

export async function getPipelineRunsWithStaleCleanup(): Promise<{
  runs: PipelineRun[];
  staleFixed: number;
}> {
  const cutoff = new Date(Date.now() - PIPELINE_STALE_AFTER_MS).toISOString();
  const staleFixed = shouldUseSupabaseStore()
    ? await supa.markStalePipelineRuns(cutoff, STALE_PIPELINE_MESSAGE)
    : local.markStalePipelineRuns(cutoff, STALE_PIPELINE_MESSAGE);
  return {
    runs: await getPipelineRuns(),
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
  approvedDailyNewsQuestionsToday: number;
  approvedContextQuestionsToday: number;
  cardsWithDailyNewsQuestion: number;
  cardsWithContextQuestions: number;
  battleReady: boolean;
  questionFallbackActive: boolean;
  topicMix: Partial<Record<TopicTag, number>>;
  sourceMix: Record<string, number>;
  sourceConcentrationWarning: string | null;
  slots: Array<{
    slot: number;
    title: string;
    id: string;
    topicTags: TopicTag[];
    approvedQuestionCount: number;
    dailyNewsQuestionCount: number;
    contextQuestionCount: number;
  } | null>;
}

/** Admin-facing view of how close today's edition is to 12/12. */
export async function getDailyStatus(date?: string): Promise<DailyStatus> {
  const day = date ?? istToday();
  let all = await getAllContentItems();
  let allQuestions = await getAllQuestions();

  // Dev/mock mode: students see mock + pipeline merged, so the admin
  // status must reflect the same merged view (clearly demo data).
  if (!shouldUseSupabaseStore()) {
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
  const dailyNewsQuestionsByItem = new Map<string, number>();
  const contextQuestionsByItem = new Map<string, number>();
  for (const q of allQuestions) {
    if (q.status !== "approved" || !q.content_item_id) continue;
    approvedQuestionsByItem.set(
      q.content_item_id,
      (approvedQuestionsByItem.get(q.content_item_id) ?? 0) + 1
    );
    if ((q.purpose ?? "daily_news") === "daily_news") {
      dailyNewsQuestionsByItem.set(
        q.content_item_id,
        (dailyNewsQuestionsByItem.get(q.content_item_id) ?? 0) + 1
      );
    } else if (isStudentReadyContextQuestion(q)) {
      contextQuestionsByItem.set(
        q.content_item_id,
        (contextQuestionsByItem.get(q.content_item_id) ?? 0) + 1
      );
    }
  }

  const topicMix: Partial<Record<TopicTag, number>> = {};
  const sourceMix: Record<string, number> = {};
  let overflow = 0;
  for (const item of published) {
    const primaryTopic = item.topic_tags[0];
    if (primaryTopic) {
      topicMix[primaryTopic] = (topicMix[primaryTopic] ?? 0) + 1;
    }
    const source = item.citations?.[0]?.source ?? "Unknown";
    sourceMix[source] = (sourceMix[source] ?? 0) + 1;
    if (typeof item.daily_slot === "number" && item.daily_slot >= 1 && item.daily_slot <= DAILY_TARGET) {
      slots[item.daily_slot - 1] = {
        slot: item.daily_slot,
        title: item.title,
        id: item.id,
        topicTags: item.topic_tags,
        approvedQuestionCount: approvedQuestionsByItem.get(item.id) ?? 0,
        dailyNewsQuestionCount: dailyNewsQuestionsByItem.get(item.id) ?? 0,
        contextQuestionCount: contextQuestionsByItem.get(item.id) ?? 0,
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
  const approvedDailyNewsQuestionsToday = allQuestions.filter(
    (q) =>
      q.status === "approved" &&
      (q.purpose ?? "daily_news") === "daily_news" &&
      q.content_item_id &&
      todayItemIds.has(q.content_item_id)
  ).length;
  const approvedContextQuestionsToday = allQuestions.filter(
    (q) =>
      q.status === "approved" &&
      isStudentReadyContextQuestion(q) &&
      q.content_item_id &&
      todayItemIds.has(q.content_item_id)
  ).length;
  const slottedItems = slots.filter((slot): slot is NonNullable<typeof slot> => slot !== null);
  const cardsWithDailyNewsQuestion = slottedItems.filter(
    (slot) => slot.dailyNewsQuestionCount > 0
  ).length;
  const cardsWithContextQuestions = slottedItems.filter(
    (slot) => slot.contextQuestionCount >= 3
  ).length;
  const dailyQuizReady =
    slottedItems.length === DAILY_TARGET && cardsWithDailyNewsQuestion === DAILY_TARGET;
  const dominantSource = Object.entries(sourceMix).sort((a, b) => b[1] - a[1])[0];
  const sourceConcentrationWarning =
    dominantSource && published.length > 0 && dominantSource[1] / published.length > 0.6
      ? `${dominantSource[0]} supplies ${dominantSource[1]} of ${published.length} published cards.`
      : null;

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
    approvedDailyNewsQuestionsToday,
    approvedContextQuestionsToday,
    cardsWithDailyNewsQuestion,
    cardsWithContextQuestions,
    battleReady: dailyQuizReady,
    questionFallbackActive: !dailyQuizReady,
    topicMix,
    sourceMix,
    sourceConcentrationWarning,
    slots,
  };
}
