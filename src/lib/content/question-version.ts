import type { Question } from "@/lib/types/database";

/** Version 2 adds an independent factual review after question generation. */
export const QUESTION_VALIDATION_VERSION = 3;

export function isStudentReadyContextQuestion(question: Question) {
  return (
    question.purpose === "context" &&
    (question.validation_version ?? 0) >= QUESTION_VALIDATION_VERSION
  );
}
