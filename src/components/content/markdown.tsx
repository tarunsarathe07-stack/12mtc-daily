/**
 * Minimal markdown renderer for trusted, internally-generated content
 * (current-affairs explainers + funnel blog bodies).
 * Supports: ## headings, - bullets (with **bold** lead), numbered lines,
 * **bold** inline, paragraphs.
 */

import React from "react";

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

export function Markdown({ body }: { body: string }) {
  return (
    <div className="space-y-1">
      {body.split("\n").map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="mt-7 mb-3 text-xl font-bold text-foreground">
              {line.replace("## ", "")}
            </h2>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <p key={i} className="ml-4 mb-1.5 text-[15px] leading-relaxed text-muted-foreground">
              •&nbsp;{renderInline(line.replace("- ", ""), `b${i}`)}
            </p>
          );
        }
        if (/^\d+\./.test(line)) {
          return (
            <p key={i} className="ml-4 mb-1.5 text-[15px] leading-relaxed text-muted-foreground">
              {renderInline(line, `n${i}`)}
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return (
          <p key={i} className="mb-2 text-[15px] leading-relaxed text-muted-foreground">
            {renderInline(line, `p${i}`)}
          </p>
        );
      })}
    </div>
  );
}
