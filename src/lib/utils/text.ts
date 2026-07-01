/**
 * Strip markdown syntax for plain-text previews (card summaries, list views)
 * where the full Markdown renderer isn't used. Not for the full explainer
 * page — that uses @/components/content/markdown for proper rendering.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")       // headings
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1")     // italics
    .replace(/^[-*]\s+/gm, "")         // bullets
    .replace(/^\d+\.\s+/gm, "")        // numbered lists
    .replace(/`([^`]+)`/g, "$1")       // inline code
    .replace(/\n{2,}/g, " ")           // collapse blank lines
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
