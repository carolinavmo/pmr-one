import { useTranslations } from "next-intl";

// "One 6/7px bar split in those proportions" — used both at the
// header (topic-wide totals) and per deck row (FLASHCARDS-SPEC.md).
// Colours are fixed regardless of topic (new red, known green);
// "learning" is the one segment that reads the topic's own colour —
// same rule flashcard-sm2.ts and the study screen already follow.
//
// The green segment is `knownCount`, NOT the raw review-state count —
// a card graded "Good" once is state=review with interval_days=1,
// nowhere near the 21-day "known" threshold (flashcard-sm2.ts's
// isKnown / KNOWN_INTERVAL_THRESHOLD_DAYS). Painting that card green
// here while the ring next to it (KnownPercentRing, same knownCount ÷
// cardCount) reads 0% is exactly the "why doesn't the percentage
// match the bar" bug this component used to have — an immature
// review card now folds into the learning segment instead
// (FLASHCARDS-TOPICS-SECTION.md: "learning = ...or in review with
// interval < 21 days"), so the two can never disagree.
export function TopicStateBar({
  newCount,
  learningCount,
  reviewCount,
  knownCount,
  topicColor,
  height = 7,
  showLegend = false,
}: {
  newCount: number;
  learningCount: number;
  reviewCount: number;
  knownCount: number;
  topicColor: string | null;
  height?: number;
  showLegend?: boolean;
}) {
  const t = useTranslations("flashcards");
  const barLearning = learningCount + (reviewCount - knownCount);
  const total = newCount + barLearning + knownCount;
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  const summary = `${newCount} ${t("studyStateNew")}, ${barLearning} ${t("studyStateLearning")}, ${knownCount} ${t("known")}`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex w-full overflow-hidden rounded-full bg-border" style={{ height }} title={summary}>
        {total === 0 ? null : (
          <>
            {newCount > 0 && <div style={{ width: `${pct(newCount)}%`, backgroundColor: "#E8564B" }} />}
            {barLearning > 0 && (
              <div
                data-topic-color={topicColor ?? undefined}
                style={{ width: `${pct(barLearning)}%`, backgroundColor: topicColor ? "var(--topic)" : "#0E9BA6" }}
              />
            )}
            {knownCount > 0 && <div style={{ width: `${pct(knownCount)}%`, backgroundColor: "#4FBF86" }} />}
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
            {t("studyStateLearning")} {barLearning}
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ backgroundColor: "#4FBF86" }} />
            {t("known")} {knownCount}
          </span>
        </div>
      )}
    </div>
  );
}
