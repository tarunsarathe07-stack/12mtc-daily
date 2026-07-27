"use client";

import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/types/database";

export function ContextQuiz({ questions }: { questions: Question[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) return null;

  const question = questions[index];
  const answered = selected !== null;
  const selectedIsCorrect = selected === question.correct_option;

  function choose(label: string) {
    if (answered) return;
    setSelected(label);
    if (label === question.correct_option) setScore((value) => value + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }

  return (
    <section id="go-deeper-quiz" className="scroll-mt-24 border-y border-border py-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="editorial-kicker text-primary">Go deeper</p>
          <h2 className="mt-1 font-display text-xl font-semibold">Understand the wider story</h2>
        </div>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
          {finished ? questions.length : index + 1}/{questions.length}
        </span>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-1.5" aria-hidden>
        {questions.map((item, position) => (
          <span
            key={item.id}
            className={cn(
              "h-1.5 rounded-full bg-muted",
              (position < index || finished) && "bg-primary",
              position === index && !finished && "bg-saffron"
            )}
          />
        ))}
      </div>

      {finished ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm font-semibold text-primary">Topic review complete</p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {score}/{questions.length}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            You have reviewed the institutions, concepts, and wider background connected to this story.
          </p>
          <Button type="button" variant="outline" className="mt-4" onClick={restart}>
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-base font-semibold leading-7">{question.prompt}</p>
          <div className="mt-4 grid gap-2.5">
            {question.options.map((option) => {
              const isSelected = selected === option.label;
              const isCorrect = option.label === question.correct_option;
              return (
                <button
                  key={option.label}
                  type="button"
                  disabled={answered}
                  onClick={() => choose(option.label)}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5 text-left text-sm transition-colors",
                    !answered && "hover:border-primary/40 hover:bg-primary/5",
                    answered && isCorrect && "border-primary/40 bg-primary/10",
                    answered && isSelected && !isCorrect && "border-coral/35 bg-coral-soft"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold",
                      answered && isCorrect && "border-primary bg-primary text-primary-foreground",
                      answered && isSelected && !isCorrect && "border-coral bg-coral text-white"
                    )}
                  >
                    {answered && isCorrect ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : answered && isSelected ? (
                      <X className="h-3.5 w-3.5" />
                    ) : (
                      option.label
                    )}
                  </span>
                  <span className="leading-5">{option.text}</span>
                </button>
              );
            })}
          </div>

          {answered && (
            <div
              className={cn(
                "mt-4 rounded-lg border p-4",
                selectedIsCorrect
                  ? "border-primary/20 bg-primary/5"
                  : "border-saffron/30 bg-saffron-soft"
              )}
            >
              <p className="text-sm font-bold">
                {selectedIsCorrect ? "Correct" : "Not quite"}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {question.explanation}
              </p>
              <Button type="button" className="mt-4" onClick={next}>
                {index + 1 === questions.length ? "See result" : "Next question"}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
