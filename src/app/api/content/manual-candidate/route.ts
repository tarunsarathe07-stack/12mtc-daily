/**
 * POST /api/content/manual-candidate  (ADMIN/EDITOR ONLY)
 *
 * Editorial override for important stories that RSS discovery misses.
 * This does NOT publish directly. It creates a review item + draft questions,
 * so the normal admin review/publish flow still controls the daily 12.
 */

import { randomUUID } from "crypto";
import { requireAdmin, adminDenied } from "@/lib/auth/admin-guard";
import { generateContentFromArticle } from "@/lib/content/summarizer";
import { generateQuizQuestions } from "@/lib/content/quiz-generator";
import {
  isUrlIngested,
  upsertContentItems,
  upsertQuestions,
} from "@/lib/content/data";
import { istToday } from "@/lib/utils/date";
import type { ContentItem, Question, TopicTag } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const VALID_TOPICS: TopicTag[] = [
  "polity",
  "legal",
  "international",
  "economy",
  "environment",
  "awards",
  "reports",
];

const TOPIC_TERMS: Record<TopicTag, string[]> = {
  legal: ["court", "supreme court", "high court", "law", "act", "bill", "constitution", "rights", "tribunal"],
  polity: ["parliament", "election", "speaker", "commission", "government", "governance", "policy"],
  international: ["g7", "iran", "hormuz", "foreign", "bilateral", "treaty", "summit", "war", "uk", "u.s.", "us"],
  economy: ["rbi", "sebi", "inflation", "budget", "tax", "gdp", "trade", "oil"],
  environment: ["climate", "environment", "forest", "wildlife", "pollution", "biodiversity"],
  awards: ["award", "prize", "honour", "ranked"],
  reports: ["report", "index", "survey", "study", "data"],
};

function inferTopics(text: string): TopicTag[] {
  const lower = text.toLowerCase();
  const topics = VALID_TOPICS.filter((topic) =>
    TOPIC_TERMS[topic].some((term) => lower.includes(term))
  );
  return topics.length > 0 ? topics.slice(0, 2) : ["polity"];
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return adminDenied(auth);

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not set. Manual candidates require generation." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const source = typeof body.source === "string" ? body.source.trim() : "Editorial desk";
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const snippet = typeof body.snippet === "string" ? body.snippet.trim() : "";
    const contentDate = typeof body.content_date === "string" ? body.content_date : istToday();
    const requestedTopics = Array.isArray(body.topics)
      ? body.topics.filter((topic: string) => VALID_TOPICS.includes(topic as TopicTag)).slice(0, 2)
      : [];

    if (!title) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    if (url && (await isUrlIngested(url))) {
      return Response.json(
        { error: "This source URL is already in the content archive." },
        { status: 409 }
      );
    }

    const hintTopics =
      requestedTopics.length > 0
        ? (requestedTopics as TopicTag[])
        : inferTopics(`${title} ${snippet}`);

    const articleText = snippet
      ? `Editorial candidate notes:\n${snippet}`
      : `Manual editorial candidate. Only the title is available: ${title}`;

    const content = await generateContentFromArticle(
      title,
      url || "manual-editorial-candidate",
      source,
      hintTopics,
      articleText
    );

    const itemId = randomUUID();
    const now = new Date().toISOString();
    const item: ContentItem = {
      id: itemId,
      slug: content.slug,
      title: content.title,
      summary: content.summary,
      body: content.body,
      why_it_matters: content.why_it_matters,
      topic_tags: content.topic_tags,
      source_urls: url ? [url] : [],
      citations: url ? [{ source, url }] : [],
      image_url: null,
      difficulty: content.difficulty,
      status: "review",
      reviewed_by: null,
      review_notes: "Manual editorial candidate. Review before publishing.",
      published_at: null,
      content_date: contentDate,
      daily_slot: null,
      created_at: now,
      updated_at: now,
    };

    const rawQuestions = await generateQuizQuestions(
      content.title,
      content.summary,
      content.body,
      content.topic_tags[0],
      content.difficulty,
      4
    );

    const questions: Question[] = rawQuestions.map((question) => ({
      id: randomUUID(),
      content_item_id: itemId,
      prompt: question.prompt,
      options: question.options,
      correct_option: question.correct_option,
      explanation: question.explanation,
      topic: content.topic_tags[0],
      difficulty: content.difficulty,
      source_citation: source,
      status: "draft",
      created_at: now,
    }));

    await upsertContentItems([item]);
    await upsertQuestions(questions);

    return Response.json({
      success: true,
      authVia: auth.via,
      item: {
        id: item.id,
        title: item.title,
        slug: item.slug,
        status: item.status,
        content_date: item.content_date,
        topics: item.topic_tags,
      },
      questions: questions.length,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Manual candidate failed" },
      { status: 500 }
    );
  }
}
