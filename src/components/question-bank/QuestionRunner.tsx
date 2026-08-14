"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Difficulty, QuestionAttemptResult, QuestionSetDetail } from "@/lib/question-bank";
import { recordAttemptAction } from "@/lib/actions/question-bank";

const SIZE = 100;
const RADIUS = 40;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DIFFICULTY_LABEL_KEY: Record<Difficulty, "difficultyEasy" | "difficultyMedium" | "difficultyHard"> = {
  easy: "difficultyEasy",
  medium: "difficultyMedium",
  hard: "difficultyHard",
};

// The member-facing one-question-at-a-time view. Selecting an option
// calls recordAttemptAction, which is the only place is_correct/
// rationale for an unanswered question is allowed to reach the client
// (see this feature's plan file and getSetWithQuestions in
// question-bank.ts) — the reveal shown here always comes from that
// action's response or from a question's own pre-existing
// yourAttempt/reveal (safe: it already happened before this page load).
export function QuestionRunner({ set, isSignedIn }: { set: QuestionSetDetail; isSignedIn: boolean }) {
  const t = useTranslations("questionBank");
  const [index, setIndex] = useState(0);
  const [reveals, setReveals] = useState<Record<string, QuestionAttemptResult>>(() => {
    const initial: Record<string, QuestionAttemptResult> = {};
    for (const q of set.questions) {
      if (q.reveal && q.yourAttempt) {
        initial[q.id] = {
          isCorrect: q.yourAttempt.isCorrect,
          correctOptionId: q.reveal.correctOptionId,
          explanation: q.reveal.explanation,
          optionRationales: q.reveal.optionRationales,
        };
      }
    }
    return initial;
  });
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const q of set.questions) {
      if (q.yourAttempt?.selectedOptionId) initial[q.id] = q.yourAttempt.selectedOptionId;
    }
    return initial;
  });
  const [isPending, startTransition] = useTransition();

  const total = set.questions.length;
  const current = set.questions[index];

  if (!current) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center font-ui text-sm text-secondary">
        {t("emptySet")}
      </div>
    );
  }

  const reveal = reveals[current.id];
  const selectedOptionId = selections[current.id];

  function goTo(nextIndex: number) {
    setIndex((nextIndex + total) % total);
  }

  function handleSelect(optionId: string) {
    if (!isSignedIn || reveal || isPending) return;
    setSelections((prev) => ({ ...prev, [current.id]: optionId }));
    startTransition(async () => {
      const result = await recordAttemptAction(current.id, optionId);
      setReveals((prev) => ({ ...prev, [current.id]: result }));
    });
  }

  const attemptedCount = Object.keys(reveals).length;
  const correctCount = Object.values(reveals).filter((r) => r.isCorrect).length;
  const isLastQuestion = index === total - 1;

  return (
    <div className={`flex flex-col gap-6 ${isLastQuestion ? "lg:flex-row" : ""}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="font-ui text-xs text-secondary tabular-nums">
            {t("questionOf", { current: index + 1, total })}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label={t("previous")}
              className="flex size-8 items-center justify-center rounded-full border border-border text-secondary hover:bg-border/40"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label={t("next")}
              className="flex size-8 items-center justify-center rounded-full border border-border text-secondary hover:bg-border/40"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
          <p className="font-heading text-lg font-semibold text-primary sm:text-xl">{current.prompt}</p>

          <div className="flex flex-col gap-2">
            {current.options.map((option, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = selectedOptionId === option.id;
              const isCorrectOption = reveal?.correctOptionId === option.id;
              const showWrong = reveal && isSelected && !reveal.isCorrect;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  disabled={!isSignedIn || Boolean(reveal) || isPending}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left font-ui text-sm transition-colors duration-base ${
                    isCorrectOption
                      ? "border-trust bg-trust/10"
                      : showWrong
                        ? "border-card-red bg-card-red/10"
                        : "border-border hover:border-accent/40 hover:bg-border/20"
                  } ${!isSignedIn || reveal ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border font-ui text-xs font-medium ${
                      isCorrectOption
                        ? "border-trust bg-trust/15 text-trust"
                        : showWrong
                          ? "border-card-red bg-card-red/15 text-card-red"
                          : "border-border text-secondary"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className={`min-w-0 flex-1 ${isCorrectOption ? "font-medium text-trust" : "text-primary"}`}>
                    {option.label}
                  </span>
                  {isCorrectOption && <Check className="size-4 shrink-0 text-trust" aria-hidden="true" />}
                  {showWrong && <X className="size-4 shrink-0 text-card-red" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {!isSignedIn && (
            <div className="flex flex-col items-center gap-1.5 border-t border-border pt-4 text-center">
              <p className="font-ui text-xs text-secondary">{t("signInToTrack")}</p>
              <Link href="/login" className="font-ui text-xs font-medium text-accent hover:underline">
                {t("signInLink")}
              </Link>
            </div>
          )}

          {reveal && (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                    reveal.isCorrect ? "bg-trust/15 text-trust" : "bg-card-red/15 text-card-red"
                  }`}
                >
                  {reveal.isCorrect ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <X className="size-3.5" aria-hidden="true" />
                  )}
                </span>
                <span className={`font-ui text-sm font-semibold ${reveal.isCorrect ? "text-trust" : "text-card-red"}`}>
                  {reveal.isCorrect ? t("correct") : t("incorrect")}
                </span>
              </div>

              {reveal.explanation && (
                <div>
                  <p className="font-ui text-xs font-semibold text-secondary">{t("explanation")}</p>
                  <p className="mt-1 font-ui text-sm text-secondary">{reveal.explanation}</p>
                </div>
              )}

              {Object.values(reveal.optionRationales).some(Boolean) && (
                <div>
                  <p className="font-ui text-xs font-semibold text-secondary">{t("whyOthersIncorrect")}</p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {current.options.map((option, i) => {
                      const rationale = reveal.optionRationales[option.id];
                      if (!rationale || option.id === reveal.correctOptionId) return null;
                      return (
                        <li key={option.id} className="flex items-start gap-2 font-ui text-sm text-secondary">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-card-red/15 font-ui text-xs font-semibold text-card-red">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span>
                            <span className="font-medium text-primary">{option.label}</span> — {rationale}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          className="self-end rounded-full bg-accent px-4 py-2 font-ui text-sm font-medium text-white hover:bg-accent-hover"
        >
          {t("nextQuestion")}
        </button>
      </div>

      {isLastQuestion && (
        <div className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
          <PerformanceDonut correct={correctCount} attempted={attemptedCount} total={total} />

          <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface-raised p-4">
            <h2 className="font-ui text-sm font-medium text-primary">{t("questionDetails")}</h2>
            {current.topicLabel && (
              <div className="flex flex-col gap-0.5">
                <span className="font-ui text-xs text-secondary">{t("topicArea")}</span>
                <span className="font-ui text-sm text-primary">{current.topicLabel}</span>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="font-ui text-xs text-secondary">{t("difficultyLabel")}</span>
              <span className="font-ui text-sm text-primary">{t(DIFFICULTY_LABEL_KEY[set.difficulty])}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-ui text-xs text-secondary">{t("questionType")}</span>
              <span className="font-ui text-sm text-primary">{t("singleBestAnswer")}</span>
            </div>
            {current.yourAttempt && (
              <div className="flex flex-col gap-0.5">
                <span className="font-ui text-xs text-secondary">{t("lastUsed")}</span>
                <span className="font-ui text-sm text-primary">
                  {new Date(current.yourAttempt.answeredAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {current.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {current.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-border/40 px-2.5 py-1 font-ui text-xs text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Hand-built SVG ring, same technique as
// src/components/study-planner/OverallProgressCard.tsx, adapted for
// this set's correct/incorrect/unanswered breakdown instead of
// completed/in-progress/pending.
function PerformanceDonut({ correct, attempted, total }: { correct: number; attempted: number; total: number }) {
  const t = useTranslations("questionBank");
  const incorrect = attempted - correct;
  const unanswered = total - attempted;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);

  const segments =
    total === 0
      ? [{ value: 1, className: "stroke-border" }]
      : [
          { value: correct, className: "stroke-trust" },
          { value: incorrect, className: "stroke-card-red" },
          { value: unanswered, className: "stroke-border" },
        ];

  let cumulative = 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-4">
      <h2 className="font-ui text-sm font-medium text-primary">{t("yourPerformance")}</h2>
      <div className="flex items-center gap-5">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-24 shrink-0" role="img" aria-label={`${percent}%`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" className="stroke-border/40" strokeWidth={STROKE} />
          {segments.map((segment, i) => {
            const length = (segment.value / (total || 1)) * CIRCUMFERENCE;
            const dashoffset = -cumulative;
            cumulative += length;
            if (segment.value === 0) return null;
            return (
              <circle
                key={i}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                className={segment.className}
                strokeWidth={STROKE}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={dashoffset}
                strokeLinecap={segments.length > 1 ? "butt" : "round"}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            );
          })}
          <text
            x={SIZE / 2}
            y={SIZE / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-primary font-heading text-[22px] font-semibold"
          >
            {percent}%
          </text>
        </svg>

        <ul className="flex flex-col gap-2 font-ui text-sm">
          <li className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full bg-trust" />
            <span className="text-secondary">{t("correctLabel")}</span>
            <span className="font-medium text-primary">{correct}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full bg-card-red" />
            <span className="text-secondary">{t("incorrectLabel")}</span>
            <span className="font-medium text-primary">{incorrect}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full bg-border" />
            <span className="text-secondary">{t("unansweredLabel")}</span>
            <span className="font-medium text-primary">{unanswered}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
