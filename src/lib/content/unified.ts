/**
 * Unified content layer — student-facing reads for CURRENT AFFAIRS only.
 * (Funnel blogs live in @/lib/blog — never mixed with current affairs.)
 *
 * Production path: Supabase Postgres.
 * Dev fallback:    local JSON pipeline store + hardcoded mock data,
 *                  merged so demo flows always render.
 *
 * All functions are async so backends are interchangeable.
 */

import {
  MOCK_CONTENT,
  MOCK_QUESTIONS,
  getPublishedContent as getMockPublished,
} from "@/lib/mock-data";
import * as data from "./data";
import { shouldUseSupabaseStore, isMockMode, DAILY_TARGET } from "./config";
import { istToday } from "@/lib/utils/date";
import type { ContentItem, Question } from "@/lib/types/database";
import { isStudentReadyContextQuestion } from "./question-version";

/** Resolve the IST "news day" for an item (explicit or derived). */
export function getContentDate(item: ContentItem): string {
  return (
    item.content_date ?? (item.published_at ?? item.created_at).slice(0, 10)
  );
}

async function pipelinePublished(): Promise<ContentItem[]> {
  try {
    return await data.getPublishedContentItems();
  } catch {
    // Store unavailable (no file yet / FS or network error) — degrade gracefully
    return [];
  }
}

/** All published current affairs — Supabase in production, store+mock in dev. */
export async function getAllPublishedContent(): Promise<ContentItem[]> {
  const pipelineItems = await pipelinePublished();

  // Production: Supabase only — mock data never leaks into real content.
  if (shouldUseSupabaseStore()) return pipelineItems;

  // Dev/mock: real pipeline content REPLACES demo cards day-by-day.
  // A day that has any published pipeline items shows only those;
  // demo cards only fill days with no real content, clearly tagged.
  const mockItems = isMockMode() ? getMockPublished() : [];
  const coveredDates = new Set(pipelineItems.map((i) => getContentDate(i)));
  const slugSet = new Set(pipelineItems.map((i) => i.slug));
  const fillerMock = mockItems
    .filter((i) => !slugSet.has(i.slug) && !coveredDates.has(getContentDate(i)))
    .map((i) => ({ ...i, is_demo: true }));
  return [...pipelineItems, ...fillerMock];
}

export async function getPublishedContentPage(
  page: number,
  limit: number
): Promise<{ items: ContentItem[]; total: number }> {
  if (shouldUseSupabaseStore()) {
    return data.getPublishedContentPage((page - 1) * limit, limit);
  }

  const items = (await getAllPublishedContent()).sort(
    (a, b) =>
      getContentDate(b).localeCompare(getContentDate(a)) ||
      (a.daily_slot ?? 99) - (b.daily_slot ?? 99)
  );
  const offset = (page - 1) * limit;
  return { items: items.slice(offset, offset + limit), total: items.length };
}

/** Published content grouped by news day, newest day first. */
export async function getContentGroupedByDate(limit?: number): Promise<
  Array<{ date: string; items: ContentItem[] }>
> {
  const groups = new Map<string, ContentItem[]>();
  for (const item of await getAllPublishedContent()) {
    const date = getContentDate(item);
    const list = groups.get(date) ?? [];
    list.push(item);
    groups.set(date, list);
  }
  const grouped = [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => (a.daily_slot ?? 99) - (b.daily_slot ?? 99)),
    }));
  return typeof limit === "number" ? grouped.slice(0, limit) : grouped;
}

/** Published content for one news day (archive read — by content_date). */
export async function getContentForDate(date: string): Promise<ContentItem[]> {
  if (shouldUseSupabaseStore()) return data.getPublishedContentByDate(date);
  return (await getAllPublishedContent())
    .filter((i) => getContentDate(i) === date)
    .sort((a, b) => (a.daily_slot ?? 99) - (b.daily_slot ?? 99));
}

/** Look up one published item by id without loading the archive. */
export async function getPublishedContentById(
  id: string
): Promise<ContentItem | undefined> {
  try {
    const item = await data.getContentItemById(id);
    if (item?.status === "published") return item;
  } catch {
    // fall through to mock
  }
  if (shouldUseSupabaseStore()) return undefined;
  return MOCK_CONTENT.find((item) => item.id === id && item.status === "published");
}

/** Look up a single published item by slug from the active source. */
export async function getContentBySlug(slug: string): Promise<ContentItem | undefined> {
  try {
    const item = await data.getContentItemBySlug(slug);
    if (item && item.status === "published") return item;
  } catch {
    // fall through to mock
  }
  if (shouldUseSupabaseStore()) return undefined;
  return MOCK_CONTENT.find((c) => c.slug === slug && c.status === "published");
}

/** Approved broader-context questions shown inside a learning card. */
export async function getQuestionsForContent(contentId: string): Promise<Question[]> {
  try {
    const storeQs = (await data.getQuestionsForContentItem(contentId)).filter(
      (q) =>
        q.status === "approved" && isStudentReadyContextQuestion(q)
    );
    if (storeQs.length > 0) return storeQs;
  } catch {
    // fall through
  }
  if (shouldUseSupabaseStore()) return [];
  return MOCK_QUESTIONS.filter((q) => q.content_item_id === contentId).map((question) => ({
    ...question,
    purpose: "context" as const,
  }));
}

/** All approved questions from the active source(s). */
export async function getAllApprovedQuestions(): Promise<Question[]> {
  let storeQs: Question[] = [];
  try {
    storeQs = (await data.getAllQuestions()).filter((q) => q.status === "approved");
  } catch {
    // store unavailable
  }
  if (shouldUseSupabaseStore()) return storeQs;

  const mockQs = isMockMode() ? MOCK_QUESTIONS.filter((q) => q.status === "approved") : [];
  const idSet = new Set(storeQs.map((q) => q.id));
  return [...storeQs, ...mockQs.filter((q) => !idSet.has(q.id))];
}

export interface DailyQuestionResult {
  questions: Question[];
  /** How many came from today's approved current affairs. */
  fromToday: number;
  /** True when we had to fill from older/mock questions. */
  fallbackUsed: boolean;
}

/**
 * Daily battle questions — one direct-news question per published card.
 * Context questions shown inside cards never enter this pool. If a card is
 * missing a direct question, top up from other direct questions from today,
 * then from the older direct-news archive as a final resilience fallback.
 */
export async function getDailyQuestionsDetailed(
  count: number = DAILY_TARGET
): Promise<DailyQuestionResult> {
  const all = (await getAllApprovedQuestions()).filter(
    (question) => (question.purpose ?? "daily_news") === "daily_news"
  );
  const today = istToday();

  let todayItems: ContentItem[] = [];
  try {
    todayItems = await getContentForDate(today);
  } catch {
    // no published content available
  }

  const todayItemIds = new Set(todayItems.map((item) => item.id));
  const selectedIds = new Set<string>();
  const onePerCard = todayItems.flatMap((item) => {
    const question = shuffleArray(
      all.filter((candidate) => candidate.content_item_id === item.id)
    )[0];
    if (!question) return [];
    selectedIds.add(question.id);
    return [question];
  });
  const remainingToday = shuffleArray(
    all.filter(
      (question) =>
        question.content_item_id &&
        todayItemIds.has(question.content_item_id) &&
        !selectedIds.has(question.id)
    )
  );
  const olderQuestions = shuffleArray(
    all.filter(
      (question) => !question.content_item_id || !todayItemIds.has(question.content_item_id)
    )
  );

  const todayQuestions = [...shuffleArray(onePerCard), ...remainingToday].slice(0, count);
  const questions = [...todayQuestions, ...olderQuestions].slice(0, count);
  return {
    questions,
    fromToday: todayQuestions.length,
    fallbackUsed: todayQuestions.length < count,
  };
}

/** Topic practice prioritises the broader context pool, then direct news. */
export async function getQuestionsByTopic(topic: string, count: number = DAILY_TARGET): Promise<Question[]> {
  const all = (await getAllApprovedQuestions()).filter((q) => q.topic === topic);
  const context = shuffleArray(all.filter((question) => question.purpose === "context"));
  const directNews = shuffleArray(
    all.filter((question) => (question.purpose ?? "daily_news") === "daily_news")
  );
  return [...context, ...directNews].slice(0, count);
}

/** Shuffled daily mix (today-first). */
export async function getDailyQuestions(count: number = DAILY_TARGET): Promise<Question[]> {
  return (await getDailyQuestionsDetailed(count)).questions;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
