/**
 * File-backed content store for the pipeline.
 * Persists generated content items + questions to a local JSON file.
 * Replaces Supabase for dev/mock mode — swap to real DB later.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import type { ContentItem, Question } from "@/lib/types/database";

const STORE_PATH = join(process.cwd(), "data", "pipeline-store.json");

export interface PipelineRun {
  id: string;
  run_date: string;
  sources_queried: string[];
  urls_discovered: string[];
  items_generated: number;
  items_approved: number;
  items_rejected: number;
  status: "running" | "completed" | "failed";
  error_log: string | null;
  created_at: string;
}

interface StoreData {
  content_items: ContentItem[];
  questions: Question[];
  pipeline_runs: PipelineRun[];
}

function readStore(): StoreData {
  if (!existsSync(STORE_PATH)) {
    return { content_items: [], questions: [], pipeline_runs: [] };
  }
  try {
    const raw = readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw) as StoreData;
  } catch {
    return { content_items: [], questions: [], pipeline_runs: [] };
  }
}

function writeStore(data: StoreData): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// ── Content Items ──────────────────────────────────

export function getAllContentItems(): ContentItem[] {
  return readStore().content_items;
}

export function getContentItemsByStatus(status: string): ContentItem[] {
  return readStore().content_items.filter((c) => c.status === status);
}

export function getPublishedContentItems(): ContentItem[] {
  return getContentItemsByStatus("published");
}

export function getContentItemBySlug(slug: string): ContentItem | undefined {
  return readStore().content_items.find((c) => c.slug === slug);
}

export function getContentItemById(id: string): ContentItem | undefined {
  return readStore().content_items.find((c) => c.id === id);
}

export function upsertContentItem(item: ContentItem): void {
  const store = readStore();
  const idx = store.content_items.findIndex((c) => c.id === item.id);
  if (idx >= 0) {
    store.content_items[idx] = item;
  } else {
    store.content_items.push(item);
  }
  writeStore(store);
}

export function upsertContentItems(items: ContentItem[]): void {
  const store = readStore();
  for (const item of items) {
    const idx = store.content_items.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      store.content_items[idx] = item;
    } else {
      store.content_items.push(item);
    }
  }
  writeStore(store);
}

export function updateContentStatus(
  id: string,
  status: ContentItem["status"],
  reviewNotes?: string
): ContentItem | null {
  const store = readStore();
  const item = store.content_items.find((c) => c.id === id);
  if (!item) return null;

  item.status = status;
  item.updated_at = new Date().toISOString();
  if (reviewNotes !== undefined) item.review_notes = reviewNotes;
  if (status === "published") item.published_at = new Date().toISOString();

  writeStore(store);
  return item;
}

/** Check if a URL was already ingested (dedup). */
export function isUrlIngested(url: string): boolean {
  return readStore().content_items.some((c) =>
    c.source_urls.some((u) => u === url)
  );
}

// ── Questions ──────────────────────────────────────

export function getAllQuestions(): Question[] {
  return readStore().questions;
}

export function getQuestionsForContentItem(contentItemId: string): Question[] {
  return readStore().questions.filter((q) => q.content_item_id === contentItemId);
}

export function getApprovedQuestionsForContentItem(contentItemId: string): Question[] {
  return readStore().questions.filter(
    (q) => q.content_item_id === contentItemId && q.status === "approved"
  );
}

export function upsertQuestions(questions: Question[]): void {
  const store = readStore();
  for (const q of questions) {
    const idx = store.questions.findIndex((sq) => sq.id === q.id);
    if (idx >= 0) {
      store.questions[idx] = q;
    } else {
      store.questions.push(q);
    }
  }
  writeStore(store);
}

export function updateQuestionStatus(
  id: string,
  status: Question["status"]
): Question | null {
  const store = readStore();
  const q = store.questions.find((sq) => sq.id === id);
  if (!q) return null;
  q.status = status;
  writeStore(store);
  return q;
}

// ── Pipeline Runs ──────────────────────────────────

export function addPipelineRun(run: PipelineRun): void {
  const store = readStore();
  store.pipeline_runs.push(run);
  writeStore(store);
}

export function updatePipelineRun(id: string, updates: Partial<PipelineRun>): void {
  const store = readStore();
  const run = store.pipeline_runs.find((r) => r.id === id);
  if (run) {
    Object.assign(run, updates);
    writeStore(store);
  }
}

export function getPipelineRuns(): PipelineRun[] {
  return readStore().pipeline_runs;
}

// ── Stats ──────────────────────────────────────────

export function getContentStats() {
  const items = getAllContentItems();
  return {
    total: items.length,
    review: items.filter((i) => i.status === "review").length,
    approved: items.filter((i) => i.status === "approved").length,
    published: items.filter((i) => i.status === "published").length,
    rejected: items.filter((i) => i.status === "rejected").length,
    draft: items.filter((i) => i.status === "draft").length,
  };
}
