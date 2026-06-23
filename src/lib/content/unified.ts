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
import { useSupabaseStore, isMockMode, DAILY_TARGET } from "./config";
import { istToday } from "@/lib/utils/date";
import type { ContentItem, Question } from "@/lib/types/database";

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
  if (useSupabaseStore()) return pipelineItems;

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

/** Published content grouped by news day, newest day first. */
export async function getContentGroupedByDate(): Promise<
  Array<{ date: string; items: ContentItem[] }>
> {
  const groups = new Map<string, ContentItem[]>();
  for (const item of await getAllPublishedContent()) {
    const date = getContentDate(item);
    const list = groups.get(date) ?? [];
    list.push(item);
    groups.set(date, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => (a.daily_slot ?? 99) - (b.daily_slot ?? 99)),
    }));
}

/** Published content for one news day (archive read — by content_date). */
export async function getContentForDate(date: string): Promise<ContentItem[]> {
  return (await getAllPublishedContent())
    .filter((i) => getContentDate(i) === date)
    .sort((a, b) => (a.daily_slot ?? 99) - (b.daily_slot ?? 99));
}

/** Look up a single published item by slug from the active source. */
export async function getContentBySlug(slug: string): Promise<ContentItem | undefined> {
  try {
    const item = await data.getContentItemBySlug(slug);
    if (item && item.status === "published") return item;
  } catch {
    // fall through to mock
  }
  if (useSupabaseStore()) return undefined;
  return MOCK_CONTENT.find((c) => c.slug === slug && c.status === "published");
}

/** Approved questions for a given content item. */
export async function getQuestionsForContent(contentId: string): Promise<Question[]> {
  try {
    const storeQs = (await data.getQuestionsForContentItem(contentId)).filter(
      (q) => q.status === "approved"
    );
    if (storeQs.length > 0) return storeQs;
  } catch {
    // fall through
  }
  if (useSupabaseStore()) return [];
  return MOCK_QUESTIONS.filter((q) => q.content_item_id === contentId);
}

/** All approved questions from the active source(s). */
export async function getAllApprovedQuestions(): Promise<Question[]> {
  let storeQs: Question[] = [];
  try {
    storeQs = (await data.getAllQuestions()).filter((q) => q.status === "approved");
  } catch {
    // store unavailable
  }
  if (useSupabaseStore()) return storeQs;

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
 * Battle questions — TODAY-FIRST policy.
 * Pull from today's approved current-affairs questions first; top up from
 * the wider approved pool if today has fewer than `count`. The fallback is
 * reported to admin via /api/content/daily-status, never surfaced as an
 * error in student UX.
 */
export async function getDailyQuestionsDetailed(
  count: number = DAILY_TARGET
): Promise<DailyQuestionResult> {
  const all = await getAllApprovedQuestions();
  const today = istToday();

  // Resolve which content items belong to today
  let todayItemIds = new Set<string>();
  try {
    const published = await getAllPublishedContent();
    todayItemIds = new Set(
      published.filter((i) => getContentDate(i) === today).map((i) => i.id)
    );
  } catch {
    // no published content available
  }

  const todayQs = shuffleArray(all.filter((q) => q.content_item_id && todayItemIds.has(q.content_item_id)));
  const olderQs = shuffleArray(all.filter((q) => !q.content_item_id || !todayItemIds.has(q.content_item_id)));

  const questions = [...todayQs.slice(0, count), ...olderQs].slice(0, count);
  return {
    questions,
    fromToday: Math.min(todayQs.length, count),
    fallbackUsed: todayQs.length < count,
  };
}

/** Shuffled questions by topic, from all sources. */
export async function getQuestionsByTopic(topic: string, count: number = DAILY_TARGET): Promise<Question[]> {
  const all = (await getAllApprovedQuestions()).filter((q) => q.topic === topic);
  return shuffleArray(all).slice(0, count);
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
