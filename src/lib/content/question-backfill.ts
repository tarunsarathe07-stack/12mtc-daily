import { randomUUID } from "crypto";
import { getPublishedContentByDate, getQuestionsForContentItem, upsertQuestions } from "./data";
import { generateQuestionSets } from "./quiz-generator";
import { getQuestionQualityWarnings } from "./quality";
import {
  isStudentReadyContextQuestion,
  QUESTION_VALIDATION_VERSION,
} from "./question-version";
import type { Question } from "@/lib/types/database";

const DAILY_NEWS_TARGET = 1;
const CONTEXT_TARGET = 3;
const BACKFILL_CONCURRENCY = 3;
const MAX_GENERATION_ATTEMPTS = 2;

export interface QuestionBackfillResult {
  cardsChecked: number;
  cardsAttempted: number;
  questionsAdded: number;
  errors: string[];
}

/** Fill missing question purposes for already-published cards without
 * replacing or duplicating questions that are already approved. */
export async function backfillQuestionSetsForDate(
  date: string
): Promise<QuestionBackfillResult> {
  const items = await getPublishedContentByDate(date);
  const existingByItem = new Map<string, Question[]>();

  await Promise.all(
    items.map(async (item) => {
      existingByItem.set(item.id, await getQuestionsForContentItem(item.id));
    })
  );

  const pending = items.filter((item) => {
    const approved = (existingByItem.get(item.id) ?? []).filter(
      (question) => question.status === "approved"
    );
    const dailyNews = approved.filter(
      (question) => (question.purpose ?? "daily_news") === "daily_news"
    ).length;
    const context = approved.filter(isStudentReadyContextQuestion).length;
    return dailyNews < 1 || context < 3;
  });

  let questionsAdded = 0;
  const errors: string[] = [];

  for (let offset = 0; offset < pending.length; offset += BACKFILL_CONCURRENCY) {
    const batch = pending.slice(offset, offset + BACKFILL_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (item) => {
        const existing = (existingByItem.get(item.id) ?? []).filter(
          (question) => question.status === "approved"
        );
        const dailyNewsCount = existing.filter(
          (question) => (question.purpose ?? "daily_news") === "daily_news"
        ).length;
        const contextCount = existing.filter(isStudentReadyContextQuestion).length;
        const now = new Date().toISOString();
        const source = item.citations?.[0]?.source ?? "Curated source";
        const additions: Question[] = [];
        const knownPrompts = new Set(existing.map((question) => question.prompt.toLowerCase()));

        for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
          const dailyNeeded = Math.max(
            0,
            DAILY_NEWS_TARGET - dailyNewsCount -
              additions.filter((question) => question.purpose === "daily_news").length
          );
          const contextNeeded = Math.max(
            0,
            CONTEXT_TARGET - contextCount -
              additions.filter((question) => question.purpose === "context").length
          );
          if (dailyNeeded === 0 && contextNeeded === 0) break;

          const sets = await generateQuestionSets(
            item.title,
            item.summary,
            item.body,
            item.topic_tags[0],
            item.difficulty
          );
          const candidates = [
            ...sets.dailyNews
              .slice(0, dailyNeeded)
              .map((question) => ({ question, purpose: "daily_news" as const })),
            ...sets.context
              .slice(0, contextNeeded)
              .map((question) => ({ question, purpose: "context" as const })),
          ].map(({ question, purpose }): Question => ({
            id: randomUUID(),
            content_item_id: item.id,
            prompt: question.prompt,
            options: question.options,
            correct_option: question.correct_option,
            explanation: question.explanation,
            topic: item.topic_tags[0],
            difficulty: item.difficulty,
            source_citation: source,
            purpose,
            validation_version: QUESTION_VALIDATION_VERSION,
            status: "approved",
            created_at: now,
          }));

          for (const question of candidates) {
            const promptKey = question.prompt.toLowerCase();
            if (knownPrompts.has(promptKey)) continue;
            if (getQuestionQualityWarnings(item, [question]).length > 0) continue;
            knownPrompts.add(promptKey);
            additions.push(question);
          }
        }

        if (additions.length > 0) await upsertQuestions(additions);
        const finalDaily =
          dailyNewsCount + additions.filter((question) => question.purpose === "daily_news").length;
        const finalContext =
          contextCount + additions.filter((question) => question.purpose === "context").length;
        if (finalDaily < 1 || finalContext < 3) {
          throw new Error(
            `Grounded question coverage remains incomplete (${finalDaily} daily, ${finalContext} context).`
          );
        }
        return additions.length;
      })
    );

    settled.forEach((result, index) => {
      if (result.status === "fulfilled") {
        questionsAdded += result.value;
      } else {
        errors.push(
          `Question backfill failed for "${batch[index].title}": ${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          }`
        );
      }
    });
  }

  return {
    cardsChecked: items.length,
    cardsAttempted: pending.length,
    questionsAdded,
    errors,
  };
}
