/**
 * Claude Haiku — generate InShorts-style summary + blog explainer
 * for a CLAT-relevant current affairs item.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { TopicTag } from "@/lib/types/database";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

const VALID_TOPICS: TopicTag[] = [
  "polity", "legal", "international", "economy", "environment", "awards", "reports",
];

// Official CLAT UG Current Affairs / GK syllabus categories
const VALID_CLAT_CATEGORIES = [
  "National Governance",    // Indian polity, government, parliament, schemes
  "Legal & Constitutional", // SC/HC judgments, constitutional provisions, landmark cases
  "International Affairs",  // foreign policy, bilateral, UN, global summits
  "Economy & Finance",      // RBI, SEBI, budget, trade, GDP, monetary policy
  "Environment & Science",  // climate, biodiversity, ISRO, technology
  "Arts, Culture & Heritage", // UNESCO, heritage, awards, classical/folk arts, history
  "Reports & Indices",      // surveys, rankings, government reports, committees
] as const;

type ClatCategory = typeof VALID_CLAT_CATEGORIES[number];

export interface GeneratedContent {
  title: string;
  slug: string;
  summary: string;          // 60-90 words
  body: string;             // 300-500 words markdown
  why_it_matters: string;   // "[Category] 1-sentence exam relevance"
  clat_syllabus_category: ClatCategory;
  topic_tags: TopicTag[];
  difficulty: "easy" | "medium" | "hard";
}

export async function generateContentFromArticle(
  articleTitle: string,
  articleUrl: string,
  source: string,
  hintTopics: TopicTag[],
  /** Full or partial article text fetched from the source (may be empty). */
  articleText?: string
): Promise<GeneratedContent> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const hasFullText = articleText && articleText.length > 200;

  const systemPrompt = `You are an expert CLAT (Common Law Admission Test) current-affairs content writer for Indian law aspirants.
You create educational learning cards and blog explainers from real news.

CLAT UG syllabus for Current Affairs/GK (official): contemporary events of national and international significance, arts and culture, historical events of continuing significance. This is NOT a law-only exam section — it is general current awareness.

Rules:
- Write for CLAT UG aspirants (17-22 year-olds) preparing India's national law entrance exam.
- Summary must be 60-90 words, crisp and factual.
- Blog body must be 300-500 words in markdown with sections: Background, Key Facts (bullet points), CLAT Relevance, Key Takeaways.
- "why_it_matters" format: "[Category] One sentence explaining exam relevance." — the category MUST match the clat_syllabus_category exactly.
- Slug must be lowercase-kebab-case, max 60 chars.
- Topic tags from: polity, legal, international, economy, environment, awards, reports. Pick 1-2 most relevant.
- Difficulty: easy (recall), medium (application), hard (analysis).
- clat_syllabus_category must be exactly one of:
  "National Governance" | "Legal & Constitutional" | "International Affairs" | "Economy & Finance" | "Environment & Science" | "Arts, Culture & Heritage" | "Reports & Indices"

CRITICAL — factual accuracy:
- ONLY include facts explicitly stated in the source material.
- Do NOT invent dates, provision numbers, case names, statistics, or names not present in the source.
- If only a headline/snippet is available, write a shorter, cautious summary. Do not pad with guesses.
- ${hasFullText ? "Full article text is provided — use it as the authoritative source." : "Only a headline/snippet is available — stick strictly to what is stated. Keep Key Facts brief."}`;

  const articleSection = hasFullText
    ? `**Full article text:**\n${articleText!.slice(0, 4000)}`
    : `**Note:** Only headline available from this source. Stick to facts in the headline.`;

  const userPrompt = `Generate a CLAT learning card and blog explainer from this news article:

**Title:** ${articleTitle}
**Source:** ${source}
**Suggested topics:** ${hintTopics.join(", ")}

${articleSection}

Respond in this exact JSON format (no markdown fences, just raw JSON):
{
  "title": "...",
  "slug": "...",
  "summary": "...",
  "body": "## Background\\n...\\n\\n## Key Facts\\n...\\n\\n## CLAT Relevance\\n...\\n\\n## Key Takeaways\\n...",
  "why_it_matters": "[Category] One sentence.",
  "clat_syllabus_category": "National Governance",
  "topic_tags": ["..."],
  "difficulty": "easy|medium|hard"
}`;

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Parse JSON — Claude sometimes wraps in ```json fences
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  const parsed = JSON.parse(cleaned) as GeneratedContent;

  // Validate & sanitise topic tags
  parsed.topic_tags = parsed.topic_tags.filter((t) =>
    VALID_TOPICS.includes(t as TopicTag)
  ) as TopicTag[];
  if (parsed.topic_tags.length === 0) {
    parsed.topic_tags = hintTopics.length > 0 ? [hintTopics[0]] : ["polity"];
  }

  // Validate CLAT syllabus category
  if (!VALID_CLAT_CATEGORIES.includes(parsed.clat_syllabus_category as ClatCategory)) {
    parsed.clat_syllabus_category = "National Governance";
  }

  // Ensure slug is clean
  parsed.slug = parsed.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  // Validate difficulty
  if (!["easy", "medium", "hard"].includes(parsed.difficulty)) {
    parsed.difficulty = "medium";
  }

  return parsed;
}
