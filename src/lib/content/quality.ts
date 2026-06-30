import type { ContentItem, Question } from "@/lib/types/database";

const OUTSIDE_LEGAL_MARKERS = [
  "res judicata",
  "mens rea",
  "actus reus",
  "strict liability",
  "absolute liability",
  "basic structure",
  "writ of mandamus",
  "certiorari",
  "habeas corpus",
  "article 32",
  "article 226",
  "article 14",
  "article 19",
  "article 21",
  "article 246",
  "doctrine",
  "ratio decidendi",
  "obiter",
  "stare decisis",
  "special leave petition",
  "criminal procedure code",
  "indian penal code",
  "evidence act",
  "specific relief",
  "tort",
  "negligence",
  "vicarious liability",
  "promissory estoppel",
];

function normalise(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function itemText(item: ContentItem) {
  return [item.title, item.summary, item.body, item.why_it_matters]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasSource(item: ContentItem) {
  return (
    item.source_urls.some(Boolean) ||
    item.citations.some((citation) => Boolean(citation.source || citation.url))
  );
}

function hasSyllabusCategory(item: ContentItem) {
  return /syllabus category\s*:/i.test(item.review_notes ?? "");
}

export function getQuestionQualityWarnings(item: ContentItem, questions: Question[]) {
  const warnings: string[] = [];
  const passageText = itemText(item);

  questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;
    const options = Array.isArray(question.options) ? question.options : [];

    if (!normalise(question.prompt).trim()) {
      warnings.push(`${label} is missing a prompt.`);
    }

    if (options.length !== 4) {
      warnings.push(`${label} must have exactly 4 options.`);
    }

    if (!normalise(question.explanation).trim()) {
      warnings.push(`${label} is missing an explanation.`);
    }

    const questionText = [
      question.prompt,
      ...options.map((option) => option.text),
      question.explanation,
    ]
      .join(" ")
      .toLowerCase();

    const unsupportedLegalTerms = OUTSIDE_LEGAL_MARKERS.filter(
      (term) => questionText.includes(term) && !passageText.includes(term),
    );

    if (unsupportedLegalTerms.length > 0) {
      warnings.push(
        `${label} may rely on outside legal knowledge: ${unsupportedLegalTerms.slice(0, 2).join(", ")}.`,
      );
    }
  });

  return warnings;
}

export function getPublishQualityIssues(item: ContentItem, questions: Question[]) {
  const issues: string[] = [];

  if (!hasSource(item)) {
    issues.push("Add at least one source URL or citation.");
  }

  if (!normalise(item.why_it_matters).trim()) {
    issues.push("Add why this matters for CLAT Current Affairs/GK.");
  }

  if (!hasSyllabusCategory(item)) {
    issues.push("Add a syllabus category in review notes.");
  }

  if (questions.length === 0) {
    issues.push("Add quiz questions before publishing.");
  }

  return [...issues, ...getQuestionQualityWarnings(item, questions)];
}
