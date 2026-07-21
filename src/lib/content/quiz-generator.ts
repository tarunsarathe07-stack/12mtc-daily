/**
 * Claude Haiku question generation for two deliberately separate learning
 * surfaces: direct daily-news assessment and broader card-level context.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { QuestionOption, TopicTag } from "@/lib/types/database";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DAILY_NEWS_COUNT = 1;
const CONTEXT_COUNT = 3;
const CONTEXT_KEYS = ["q1", "q2", "q3"] as const;

export interface GeneratedQuestion {
  prompt: string;
  options: QuestionOption[];
  correct_option: string;
  explanation: string;
}

export interface GeneratedQuestionSets {
  dailyNews: GeneratedQuestion[];
  context: GeneratedQuestion[];
}

interface ReviewedQuestion {
  prompt?: unknown;
  options?: Partial<Record<"A" | "B" | "C" | "D", unknown>>;
  correct_option?: unknown;
  explanation?: unknown;
}

function parseQuestionSets(text: string): GeneratedQuestionSets {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const parsed = JSON.parse(extractFirstJsonObject(cleaned)) as {
    daily_news?: unknown;
    context?: unknown;
  };
  return {
    dailyNews: validQuestions(parsed.daily_news, DAILY_NEWS_COUNT),
    context: validQuestions(parsed.context, 0),
  };
}

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("Question response did not contain a JSON object.");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const character = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth++;
    } else if (character === "}") {
      depth--;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  throw new Error("Question response contained incomplete JSON.");
}

function parseReviewedContext(text: string): GeneratedQuestion[] {
  const parsed = JSON.parse(extractFirstJsonObject(text)) as {
    context?: Record<string, ReviewedQuestion>;
  };
  const labels = ["A", "B", "C", "D"] as const;

  return CONTEXT_KEYS.map((key) => {
    const question = parsed.context?.[key];
    if (
      typeof question?.prompt !== "string" ||
      typeof question.correct_option !== "string" ||
      typeof question.explanation !== "string" ||
      !labels.includes(question.correct_option as (typeof labels)[number]) ||
      !labels.every((label) => typeof question.options?.[label] === "string")
    ) {
      throw new Error(`Fact review returned an invalid ${key}.`);
    }

    return {
      prompt: question.prompt,
      options: labels.map((label) => ({
        label,
        text: question.options![label] as string,
      })),
      correct_option: question.correct_option,
      explanation: question.explanation,
    };
  });
}

async function factReviewQuestionSets(
  client: Anthropic,
  title: string,
  summary: string,
  body: string | null,
  sets: GeneratedQuestionSets
): Promise<GeneratedQuestionSets> {
  const reviewPrompt = `Create and independently fact-check the context questions for this CLAT learning card.

Do not assume the learning card or draft questions are correct. Use web search to verify every context-question premise against reliable sources, prioritising official government, constitutional, statutory, court, treaty, UN, multilateral, and institutional sources. Apply special scrutiny to:
- constitutional Article numbers and sub-clauses;
- what each right/restriction actually covers;
- statutes, sections, cases, treaties, institutions, geography, chronology, dates, and statistics;
- whether the marked correct option and explanation agree.

Rules:
- context must remain directly connected to the supplied explainer, but correct or replace any inaccurate premise in the explainer itself.
- If a fact cannot be verified confidently, replace that question with a safer, well-supported question from the supplied content.
- Do not repeat a false statement merely because it appears in the supplied explainer. For example, independently verify river allocations, constitutional sub-clauses, treaty parties, institutional powers, and geographic facts.
- Return exactly ${CONTEXT_COUNT} context questions. Do not rewrite daily_news; it is supplied only so you can avoid duplicates.
- Exactly four options and one correct answer per question. No duplicate questions.
- Return JSON only with a "context" object containing exactly ${CONTEXT_KEYS.join(", ")}. Each question's options must be an object with exactly A, B, C, and D string values.

NEWS CONTENT:
Title: ${title}
Summary: ${summary}
Detailed explainer: ${(body ?? "").slice(0, 4000)}

DIRECT-NEWS SET TO AVOID DUPLICATING:
${JSON.stringify({ daily_news: sets.dailyNews, context: sets.context })}`;

  const reviewed = await client.messages.create({
    model:
      process.env.ANTHROPIC_REVIEW_MODEL ||
      DEFAULT_MODEL,
    max_tokens: 3200,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 1,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["context"],
          properties: {
            context: {
              type: "object",
              additionalProperties: false,
              required: [...CONTEXT_KEYS],
              properties: Object.fromEntries(
                CONTEXT_KEYS.map((key) => [
                  key,
                  {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "prompt",
                      "options",
                      "correct_option",
                      "explanation",
                    ],
                    properties: {
                      prompt: { type: "string" },
                      options: {
                        type: "object",
                        additionalProperties: false,
                        required: ["A", "B", "C", "D"],
                        properties: {
                          A: { type: "string" },
                          B: { type: "string" },
                          C: { type: "string" },
                          D: { type: "string" },
                        },
                      },
                      correct_option: {
                        type: "string",
                        enum: ["A", "B", "C", "D"],
                      },
                      explanation: { type: "string" },
                    },
                  },
                ])
              ),
            },
          },
        },
      },
    },
    messages: [{ role: "user", content: reviewPrompt }],
    system:
      "You are a meticulous CLAT Current Affairs/GK fact-checker. Accuracy is more important than preserving a draft question.",
  });
  const reviewedText = reviewed.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  return { dailyNews: sets.dailyNews, context: parseReviewedContext(reviewedText) };
}

function validQuestions(value: unknown, count: number): GeneratedQuestion[] {
  if (!Array.isArray(value)) return [];
  return (value as GeneratedQuestion[])
    .filter((question) => {
      if (!question.prompt || !question.correct_option || !question.explanation) return false;
      if (!Array.isArray(question.options) || question.options.length !== 4) return false;
      const labels = question.options.map((option) => option.label);
      return labels.includes(question.correct_option);
    })
    .slice(0, count);
}

export async function generateQuestionSets(
  title: string,
  summary: string,
  body: string | null,
  topic: TopicTag,
  difficulty: string
): Promise<GeneratedQuestionSets> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const systemPrompt = `You are a CLAT (Common Law Admission Test) Current Affairs/GK question setter.

Create the direct daily-news assessment for one news learning card. A separate verified process creates the broader context set.

SET 1 — daily_news (${DAILY_NEWS_COUNT} questions):
- Tests what happened in this specific news story today.
- Every answer must be stated in or directly inferable from the supplied summary/article.
- Focus on the reported event, actor, institution, place, decision, figure, reason, or immediate consequence.
- Do not require outside legal provisions, article numbers, case law, or background facts.
- These questions will appear in a separate 12-story daily quiz and must not duplicate the context questions.

Rules:
- Exactly 4 options labelled A, B, C, D and exactly one correct answer.
- Plausible distractors; never use “All of the above” or “None of the above”.
- Mix recall, understanding, and application appropriate to CLAT Current Affairs/GK.
- Topic: ${topic}. Difficulty target: ${difficulty}.`;

  const userPrompt = `Create the direct daily-news question from this learning card:

**Title:** ${title}
**Summary:** ${summary}
${body ? `**Detailed explainer:**\n${body.slice(0, 4000)}` : ""}

Return raw JSON only, in exactly this structure:
{
  "daily_news": [
    {
      "prompt": "...",
      "options": [
        {"label": "A", "text": "..."},
        {"label": "B", "text": "..."},
        {"label": "C", "text": "..."},
        {"label": "D", "text": "..."}
      ],
      "correct_option": "A",
      "explanation": "..."
    }
  ],
  "context": []
}`;

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 1400,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const draftSets = parseQuestionSets(text);
  return factReviewQuestionSets(client, title, summary, body, draftSets);
}
