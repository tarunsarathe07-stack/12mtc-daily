/**
 * Claude Haiku — generate 3-5 CLAT-style MCQs from a content item.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Question, QuestionOption, TopicTag } from "@/lib/types/database";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

interface GeneratedQuestion {
  prompt: string;
  options: QuestionOption[];
  correct_option: string;    // "A"|"B"|"C"|"D"
  explanation: string;
}

export async function generateQuizQuestions(
  title: string,
  summary: string,
  body: string | null,
  topic: TopicTag,
  difficulty: string,
  count: number = 4
): Promise<GeneratedQuestion[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const systemPrompt = `You are a CLAT (Common Law Admission Test) question setter specialising in the Current Affairs/GK section.

CLAT Current Affairs questions are PASSAGE-BASED comprehension questions — not standalone legal theory MCQs.
The real CLAT exam provides a 300-500 word passage and asks questions whose answers are in (or directly inferable from) the passage.

Rules:
- Each question has exactly 4 options labelled A, B, C, D.
- Exactly one correct answer per question.
- All wrong options (distractors) must be plausible but clearly incorrect.
- Explanation must be 1-2 sentences explaining why the correct answer is right.
- Questions should test comprehension and current-affairs awareness — not rote law doctrine.
- Difficulty range: easy (direct recall from passage), medium (inference), hard (evaluation/application).
- Never create "All of the above" or "None of the above" options.
- Topic context: ${topic}. Difficulty target: ${difficulty}.

CRITICAL — passage-based restriction:
- Every question MUST be answerable from the passage/summary provided — do not require knowledge of legal provisions, article numbers, or case law UNLESS they are explicitly stated in the passage.
- DO NOT ask "Under which Article of the Constitution is X guaranteed?" unless the article number appears in the passage.
- DO NOT ask procedural legal questions (e.g., "How many days for bail under PMLA?") unless stated in the passage.
- GOOD question types: Who/What/Where/When from the passage; why the event matters; what organisation or country is mentioned; inference about significance.
- BAD question types: Article/Section numbers not mentioned in passage; legal doctrines not explained in passage; case law not referenced in passage.`;

  const userPrompt = `Generate exactly ${count} CLAT-style MCQ questions from this content:

**Title:** ${title}
**Summary:** ${summary}
${body ? `**Full article:**\n${body.slice(0, 3000)}` : ""}

Respond in this exact JSON format (no markdown fences, raw JSON array):
[
  {
    "prompt": "Question text here?",
    "options": [
      {"label": "A", "text": "..."},
      {"label": "B", "text": "..."},
      {"label": "C", "text": "..."},
      {"label": "D", "text": "..."}
    ],
    "correct_option": "A",
    "explanation": "..."
  }
]`;

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 2500,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  const parsed = JSON.parse(cleaned) as GeneratedQuestion[];

  // Validate each question
  return parsed
    .filter((q) => {
      if (!q.prompt || !q.correct_option || !q.explanation) return false;
      if (!Array.isArray(q.options) || q.options.length !== 4) return false;
      const labels = q.options.map((o) => o.label);
      if (!labels.includes(q.correct_option)) return false;
      return true;
    })
    .slice(0, count);
}
