import { useTranslations } from "next-intl";

// "One 6/7px bar split in those proportions" — used both at the
// header (topic-wide totals) and per deck row (FLASHCARDS-SPEC.md).
// Colours are fixed regardless of topic (new red, review green);
// "learning" is the one segment that reads the topic's own colour —
// same rule flashcard-sm2.ts and the study screen already follow.
export function TopicStateBar({
  newCount,
  learningCount,
  reviewCount,
  topicColor,
  height = 7,
  showLegend = false,
}: {
  newCount: number;
  learningCount: number;
  reviewCount: number;
  topicColor: string | null;
  height?: number;
  showLegend?: boolean;
}) {
  const t = useTranslations("flashcards");
  const total = newCount + learningCount + reviewCount;
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex w-full overflow-hidden rounded-full bg-border" style={{ height }}>
        {total === 0 ? null : (
          <>
            <div style={{ width: `${pct(newCount)}%`, backgroundColor: "#E8564B" }} />
            <div
              data-topic-color={topicColor ?? undefined}
              style={{ width: `${pct(learningCount)}%`, backgroundColor: topicColor ? "var(--topic)" : "#0E9BA6" }}
            />
            <div style={{ width: `${pct(reviewCount)}%`, backgroundColor: "#4FBF86" }} />
          </>
        )}
      </div>
      {showLegend && (
        <div className="flex items-center gap-3 font-ui text-[11px] font-bold text-secondary">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ backgroundColor: "#E8564B" }} />
            {t("studyStateNew")} {newCount}
          </span>
          <span className="flex items-center gap-1">
            <span data-topic-color={topicColor ?? undefined} className="size-2 rounded-full" style={{ backgroundColor: topicColor ? "var(--topic)" : "#0E9BA6" }} />
            {t("studyStateLearning")} {learningCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ backgroundColor: "#4FBF86" }} />
            {t("studyStateReview")} {reviewCount}
          </span>
        </div>
      )}
    </div>
  );
}
