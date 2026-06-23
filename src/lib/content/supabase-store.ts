/**
 * Supabase-backed content store — the PRODUCTION path.
 *
 * Persists daily current-affairs items, questions, pipeline runs, and
 * blog posts in Supabase Postgres. Days are keyed by content_date
 * (Asia/Kolkata) and are append-only: new days insert new rows,
 * old dates are never deleted.
 *
 * Mirrors the interface of ./store.ts (local JSON fallback) but async.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { ContentItem, Question, BlogPost } from "@/lib/types/database";
import type { PipelineRun } from "./store";

// ── Content items ──────────────────────────────────

export async function getAllContentItems(): Promise<ContentItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .order("content_date", { ascending: false })
    .order("daily_slot", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ContentItem[];
}

export async function getContentItemsByStatus(status: string): Promise<ContentItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("status", status)
    .order("content_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContentItem[];
}

export async function getPublishedContentItems(): Promise<ContentItem[]> {
  return getContentItemsByStatus("published");
}

export async function getPublishedContentByDate(date: string): Promise<ContentItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("status", "published")
    .eq("content_date", date)
    .order("daily_slot", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ContentItem[];
}

export async function getContentItemBySlug(slug: string): Promise<ContentItem | undefined> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? undefined) as ContentItem | undefined;
}

export async function getContentItemById(id: string): Promise<ContentItem | undefined> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? undefined) as ContentItem | undefined;
}

export async function upsertContentItems(items: ContentItem[]): Promise<void> {
  if (items.length === 0) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("content_items").upsert(items, { onConflict: "id" });
  if (error) throw error;
}

export async function updateContentStatus(
  id: string,
  status: ContentItem["status"],
  reviewNotes?: string
): Promise<ContentItem | null> {
  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (reviewNotes !== undefined) updates.review_notes = reviewNotes;
  if (status === "published") updates.published_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("content_items")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as ContentItem | null;
}

export async function setDailySlot(id: string, slot: number | null): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("content_items")
    .update({ daily_slot: slot })
    .eq("id", id);
  if (error) throw error;
}

export async function isUrlIngested(url: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("id")
    .contains("source_urls", [url])
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

// ── Questions ──────────────────────────────────────

export async function getAllQuestions(): Promise<Question[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("questions").select("*");
  if (error) throw error;
  return (data ?? []) as Question[];
}

export async function getQuestionsForContentItem(contentItemId: string): Promise<Question[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("content_item_id", contentItemId);
  if (error) throw error;
  return (data ?? []) as Question[];
}

export async function upsertQuestions(questions: Question[]): Promise<void> {
  if (questions.length === 0) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("questions").upsert(questions, { onConflict: "id" });
  if (error) throw error;
}

// ── Pipeline runs ──────────────────────────────────

export async function addPipelineRun(run: PipelineRun): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("content_pipeline_runs").insert(run);
  if (error) throw error;
}

export async function updatePipelineRun(
  id: string,
  updates: Partial<PipelineRun>
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("content_pipeline_runs")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function getPipelineRuns(): Promise<PipelineRun[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("content_pipeline_runs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PipelineRun[];
}

// ── Blog posts (funnel content — separate from current affairs) ──

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BlogPost[];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return (data ?? undefined) as BlogPost | undefined;
}
