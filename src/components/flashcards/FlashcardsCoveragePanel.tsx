import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CollectionCoverage, NextDue } from "@/lib/flashcards";
import { NEW_CARDS_PER_SESSION } from "@/lib/flashcard-sm2";

const KNOWN_GREEN = "#4FBF86";
const SECONDS_PER_CARD = 6;

// "Your collection" (FLASHCARDS-COVERAGE-PANEL.md) — replaces the old
// "Today's session" panel in the same navy slot. The headline is
// always known/total/percent; only the line underneath and the
// actions change with the five states below. No bespoke loading
// skeleton here (section 6 of the spec) — this whole dashboard
// already waits on one top-level Promise.all before rendering
// anything, so every other panel on the page has the same property;
// a skeleton for just this one panel would be inconsistent with the
// rest of the page rather than more honest.
export function FlashcardsCoveragePanel({ coverage, nextDue }: { coverage: CollectionCoverage; nextDue: NextDue | null }) {
  const t = useTranslations("flashcards");
  const { total, known, learning, neverSeen, dueToday } = coverage;
  const knownPercent = Math.round((known / total) * 100);
  const learnCount = Math.min(NEW_CARDS_PER_SESSION, neverSeen);

  // Segment widths as percentages of total — never-seen (the last
  // segment, matching the bar's known/learning/never-seen order) takes
  // the remainder, so known+learning+neverSeen always sums to exactly
  // 100% and rounding can never leave a sliver of the wrong colour.
  const knownPct = (known / total) * 100;
  const learningPct = (learning / total) * 100;
  const neverSeenPct = Math.max(0, 100 - knownPct - learningPct);

  let line: string;
  let primary: { label: string; href: string } | null = null;
  let secondary: { label: string; href: string } | null = null;

  if (dueToday > 0) {
    const totalSeconds = dueToday * SECONDS_PER_CARD;
    line = totalSeconds < 60 ? t("coverageDueTodayUnderMinute", { count: dueToday }) : t("coverageDueTodayMinutes", { count: dueToday, minutes: Math.round(totalSeconds / 60) });
    primary = { label: t("coverageReviewAction", { count: dueToday }), href: "/flashcards/study?due=1" };
    if (neverSeen > 0) secondary = { label: t("coverageLearnNewAction", { count: learnCount }), href: "/flashcards/study?new=1" };
  } else if (neverSeen === 0 && learning === 0) {
    line = t("coverageAllKnown");
    primary = { label: t("reviewEarly"), href: "/flashcards/study?early=1" };
  } else if (neverSeen === 0) {
    line = t("coverageAllCaughtUp");
    primary = { label: t("reviewEarly"), href: "/flashcards/study?early=1" };
  } else if (nextDue) {
    line = nextDue.inDays === 1 ? t("coverageNextTomorrow", { count: nextDue.count }) : t("coverageNextInDays", { count: nextDue.count, days: nextDue.inDays });
    primary = { label: t("coverageLearnNewAction", { count: learnCount }), href: "/flashcards/study?new=1" };
    secondary = { label: t("reviewEarly"), href: "/flashcards/study?early=1" };
  } else {
    line = t("coverageNeverSeenLine", { count: neverSeen });
    primary = { label: t("coverageLearnNewAction", { count: learnCount }), href: "/flashcards/study?new=1" };
    if (known > 0 || learning > 0) secondary = { label: t("reviewEarly"), href: "/flashcards/study?early=1" };
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-navy-fill p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-[11px] font-black tracking-[1.6px] text-[#7FCBD1] uppercase">{t("coverageHeading")}</span>
          <span className="font-heading text-[34px] leading-none font-black text-white">{t("coverageHeadline", { known, total, percent: knownPercent })}</span>
          <span className="mt-1 font-ui text-xs font-bold text-white/70">{line}</span>
        </div>

        {primary && (
          <div className="flex shrink-0 items-center gap-2">
            <Link href={primary.href} className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 font-ui text-sm font-bold text-navy hover:bg-white/90">
              <Play className="size-3.5" aria-hidden="true" />
              {primary.label}
            </Link>
            {secondary && (
              <Link href={secondary.href} className="rounded-lg border border-white/30 px-4 py-2.5 font-ui text-sm font-bold text-white hover:bg-white/10">
                {secondary.label}
              </Link>
            )}
          </div>
        )}
      </div>

      <div
        className="flex h-[18px] overflow-hidden rounded-full"
        role="img"
        aria-label={t("coverageBarAriaLabel", { known, learning, neverSeen, total })}
      >
        {knownPct > 0 && <span aria-hidden="true" style={{ width: `${knownPct}%`, backgroundColor: KNOWN_GREEN }} />}
        {learningPct > 0 && <span aria-hidden="true" style={{ width: `${learningPct}%`, backgroundColor: "var(--color-acc-dk)" }} />}
        {neverSeenPct > 0 && <span aria-hidden="true" style={{ width: `${neverSeenPct}%`, backgroundColor: "rgba(255,255,255,.18)" }} />}
      </div>

      <div className="flex items-center gap-4 font-ui text-xs font-bold text-white/70">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: KNOWN_GREEN }} />
          {t("coverageLegendKnown", { count: known })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: "var(--color-acc-dk)" }} />
          {t("coverageLegendLearning", { count: learning })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: "rgba(255,255,255,.3)" }} />
          {t("coverageLegendNeverSeen", { count: neverSeen })}
        </span>
      </div>
    </div>
  );
}
