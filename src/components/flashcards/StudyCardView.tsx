"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StudyCard } from "@/lib/flashcards";
import type { Grade, Sm2State, Sm2Outcome } from "@/lib/flashcard-sm2";

// FLASHCARDS-SPEC.md's grading buttons — fixed colours per grade
// (distinct from the topic/state palette, this is the button's own
// tint/ink), never the topic colour.
const GRADE_STYLE: Record<Grade, { tint: string; ink: string }> = {
  again: { tint: "#FDF0EF", ink: "#E8564B" },
  hard: { tint: "#FEF7E8", ink: "#A8760F" },
  good: { tint: "#EDF9F2", ink: "#1F7A4D" },
  easy: { tint: "#EDF6FD", ink: "#1E6FB8" },
};
const GRADE_KEY: Record<Grade, number> = { again: 1, hard: 2, good: 3, easy: 4 };
const GRADE_LABEL_KEY: Record<Grade, "studyGradeAgain" | "studyGradeHard" | "studyGradeGood" | "studyGradeEasy"> = {
  again: "studyGradeAgain",
  hard: "studyGradeHard",
  good: "studyGradeGood",
  easy: "studyGradeEasy",
};

function formatIntervalMinutes(minutes: number, t: ReturnType<typeof useTranslations>): string {
  if (minutes <= 1) return t("studyIntervalLessThanMin");
  if (minutes < 60) return t("studyIntervalMinutes", { count: Math.round(minutes) });
  const days = minutes / 1440;
  if (days < 1) return t("studyIntervalHours", { count: Math.round(minutes / 60) });
  return t("studyIntervalDays", { count: Math.round(days) });
}

export function StudyCardView({
  card,
  state,
  flipped,
  onFlip,
  onGrade,
  grading,
  position,
  total,
  minutesLeft,
  previews,
}: {
  card: StudyCard;
  state: Sm2State;
  flipped: boolean;
  onFlip: () => void;
  onGrade: (grade: Grade) => void;
  grading: boolean;
  position: number;
  total: number;
  minutesLeft: number;
  previews: Record<Grade, Sm2Outcome>;
}) {
  const t = useTranslations("flashcards");
  const format = useFormatter();
  const stateLabel =
    state.state === "new" ? t("studyStateNew") : state.state === "learning" ? t("studyStateLearning") : t("studyStateReview");
  const borderStyle = card.topicColor ? { borderColor: "var(--topic-bd)" } : undefined;

  const tagsRow = (
    <div className="flex items-center gap-2 font-ui text-[11px] font-black tracking-wide uppercase">
      {card.topicName && (
        <span data-topic-color={card.topicColor ?? undefined} className="rounded-full px-2.5 py-1" style={{ backgroundColor: "var(--topic-bg)", color: "var(--topic)" }}>
          {card.topicName}
        </span>
      )}
      <span className="rounded-full bg-border/40 px-2.5 py-1 text-secondary">{stateLabel}</span>
    </div>
  );
  const faceClass =
    "absolute inset-0 flex flex-col items-center justify-center gap-6 rounded-[24px] border-2 border-border bg-surface p-10 shadow-[0_12px_34px_rgba(20,40,74,0.07)] backface-hidden";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8">
      {/* A real card flip needs both faces to be the exact same
          fixed-size box in 3D space — variable, content-driven sizing
          (the previous min-h/justify-center approach) doesn't make
          sense once there are two faces rotating together. Long
          answers scroll within the back face instead of growing the
          card, same as a physical flashcard would never expand. */}
      <div className="w-full max-w-[820px] perspective-[1600px]">
        <div
          // Tapping/clicking anywhere on the card reveals the answer —
          // replaces the separate "Show answer" button. Only active
          // while !flipped: once the answer is showing, the card goes
          // back to being a plain live region (grading is a deliberate
          // choice made with the buttons below, not a stray tap).
          className={`relative h-[440px] w-full transform-3d transition-transform duration-500 ease-out motion-reduce:transition-none ${flipped ? "rotate-y-[180deg]" : ""} ${flipped ? "" : "cursor-pointer"}`}
          role={flipped ? "region" : "button"}
          tabIndex={flipped ? undefined : 0}
          aria-live="polite"
          aria-label={flipped ? t("studyCardOf", { position, total }) : t("studyShowAnswer")}
          onClick={flipped ? undefined : onFlip}
          onKeyDown={
            flipped
              ? undefined
              : (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onFlip();
                  }
                }
          }
        >
          <div data-topic-color={card.topicColor ?? undefined} className={faceClass} style={borderStyle} aria-hidden={flipped}>
            {tagsRow}
            <p className="text-center font-heading text-[36px] leading-tight font-black text-navy">{card.question}</p>
          </div>

          <div data-topic-color={card.topicColor ?? undefined} className={`${faceClass} rotate-y-[180deg]`} style={borderStyle} aria-hidden={!flipped}>
            {tagsRow}
            <p className="shrink-0 text-center font-ui text-[17px] font-extrabold text-secondary">{card.question}</p>
            <div className="flex w-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-t border-border pt-6">
              <div className="flex flex-col gap-3 whitespace-pre-wrap font-reading text-[17px] leading-relaxed text-primary">
                {card.answer}
              </div>
              {card.sourceDiseaseName && card.sourceDiseaseSlug && (
                <Link href={`/conditions/${card.sourceDiseaseSlug}`} className="font-ui text-xs font-semibold text-acc-ink hover:underline">
                  {card.topicName && card.sourceReviewedAt
                    ? t("studySourceWithTopicAndDate", {
                        topic: card.topicName,
                        disease: card.sourceDiseaseName,
                        date: format.dateTime(new Date(card.sourceReviewedAt), { year: "numeric", month: "short" }),
                      })
                    : card.topicName
                      ? t("studySourceWithTopic", { topic: card.topicName, disease: card.sourceDiseaseName })
                      : t("studySource", { disease: card.sourceDiseaseName })}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {!flipped ? (
        <p className="font-ui text-xs text-secondary">
          {t("studyTapToReveal")} · {t("studyCardOf", { position, total })} · {t("studyMinutesLeft", { minutes: minutesLeft })}
        </p>
      ) : (
        <div className="grid w-full max-w-[820px] grid-cols-2 gap-2 sm:grid-cols-4">
          {(["again", "hard", "good", "easy"] as Grade[]).map((grade) => {
            const interval = formatIntervalMinutes(previews[grade].dueInMinutes, t);
            return (
              <button
                key={grade}
                type="button"
                disabled={grading}
                onClick={() => onGrade(grade)}
                aria-label={t("studyGradeAriaLabel", { grade: t(GRADE_LABEL_KEY[grade]), interval })}
                className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2.5 font-ui disabled:opacity-50"
                style={{ backgroundColor: GRADE_STYLE[grade].tint, color: GRADE_STYLE[grade].ink }}
              >
                <span className="text-sm font-black">
                  {t(GRADE_LABEL_KEY[grade])} <span className="opacity-60">{GRADE_KEY[grade]}</span>
                </span>
                <span className="text-[11px] font-bold opacity-80">{interval}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
