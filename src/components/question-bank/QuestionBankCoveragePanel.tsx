"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { QuestionBankRailStats } from "@/lib/question-bank";
import type { QuestionSessionSummary, SessionBuildFilter } from "@/lib/question-bank-session";
import { DEFAULT_SESSION_SIZE, SECONDS_PER_QUESTION } from "@/lib/question-bank-session-constants";
import { startSessionAction } from "@/lib/actions/question-bank-session";

const CORRECT_GREEN = "#4FBF86";
const INCORRECT_RED = "#E28A8D";

// The Question Bank sibling of FlashcardsCoveragePanel — same navy
// panel, same headline/bar/legend shape (correct/incorrect/not-seen in
// place of known/learning/never-seen), same "coverage first, session
// mechanics in the line and actions" structure. No due-date scheduler
// here (question_attempt has no SM-2-style interval), so the state
// tree is simpler: resume an open session, or otherwise branch on
// incorrect/not-seen counts alone — there's no day-boundary "nothing
// due, next in N days" case to build, since nothing here is ever
// "not due yet."
export function QuestionBankCoveragePanel({ stats, activeSession }: { stats: QuestionBankRailStats; activeSession: QuestionSessionSummary | null }) {
  const t = useTranslations("questionBank");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { totalQuestions: total, answered, incorrect, notSeen } = stats;
  const correct = answered - incorrect;
  const coveragePercent = total === 0 ? 0 : Math.round((correct / total) * 100);

  // Never-seen (the last segment, matching the bar's own correct/
  // incorrect/not-seen order) takes the remainder — same rounding-safe
  // trick FlashcardsCoveragePanel uses, so the three always sum to
  // exactly 100% of the bar.
  const correctPct = total === 0 ? 0 : (correct / total) * 100;
  const incorrectPct = total === 0 ? 0 : (incorrect / total) * 100;
  const notSeenPct = Math.max(0, 100 - correctPct - incorrectPct);

  const practiceIncorrectCount = Math.min(DEFAULT_SESSION_SIZE, incorrect);
  const practiceNotSeenCount = Math.min(DEFAULT_SESSION_SIZE, notSeen);

  function startFilter(filter: SessionBuildFilter) {
    startTransition(async () => {
      const sessionId = await startSessionAction("tutor", { filter, size: DEFAULT_SESSION_SIZE });
      if (sessionId) router.push(`/question-bank/session/${sessionId}`);
    });
  }

  let line: string;
  let primary: { label: string; onClick: () => void };
  let secondary: { label: string; onClick: () => void } | null = null;

  if (activeSession) {
    line = t("resumeQOfN", { current: activeSession.position + 1, total: activeSession.size });
    primary = { label: t("resume"), onClick: () => router.push(`/question-bank/session/${activeSession.id}`) };
  } else if (incorrect > 0) {
    const totalSeconds = incorrect * SECONDS_PER_QUESTION;
    line =
      totalSeconds < 60
        ? t("coverageToReviewUnderMinute", { count: incorrect })
        : t("coverageToReviewMinutes", { count: incorrect, minutes: Math.round(totalSeconds / 60) });
    primary = { label: t("coveragePracticeIncorrect", { count: practiceIncorrectCount }), onClick: () => startFilter("incorrect") };
    if (notSeen > 0) secondary = { label: t("coveragePracticeNotSeen", { count: practiceNotSeenCount }), onClick: () => startFilter("notSeen") };
  } else if (notSeen > 0) {
    line = t("coverageNotSeenLine", { count: notSeen });
    primary = { label: t("coveragePracticeNotSeen", { count: practiceNotSeenCount }), onClick: () => startFilter("notSeen") };
  } else {
    line = t("coverageAllCorrect");
    primary = { label: t("startSession"), onClick: () => startFilter("smart") };
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-navy-fill p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-[11px] font-black tracking-[1.6px] text-[#7FCBD1] uppercase">{t("coverageHeading")}</span>
          <span className="font-heading text-[34px] leading-none font-black text-white">{t("coverageHeadline", { correct, total, percent: coveragePercent })}</span>
          <span className="mt-1 font-ui text-xs font-bold text-white/70">{line}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={primary.onClick}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 font-ui text-sm font-bold text-navy hover:bg-white/90 disabled:opacity-70"
          >
            <Play className="size-3.5" aria-hidden="true" />
            {primary.label}
          </button>
          {secondary && (
            <button
              type="button"
              onClick={secondary.onClick}
              disabled={isPending}
              className="rounded-lg border border-white/30 px-4 py-2.5 font-ui text-sm font-bold text-white hover:bg-white/10 disabled:opacity-70"
            >
              {secondary.label}
            </button>
          )}
        </div>
      </div>

      <div
        className="flex h-[18px] overflow-hidden rounded-full"
        role="img"
        aria-label={t("coverageBarAriaLabel", { correct, incorrect, notSeen, total })}
      >
        {correctPct > 0 && <span aria-hidden="true" style={{ width: `${correctPct}%`, backgroundColor: CORRECT_GREEN }} />}
        {incorrectPct > 0 && <span aria-hidden="true" style={{ width: `${incorrectPct}%`, backgroundColor: INCORRECT_RED }} />}
        {notSeenPct > 0 && <span aria-hidden="true" style={{ width: `${notSeenPct}%`, backgroundColor: "rgba(255,255,255,.18)" }} />}
      </div>

      <div className="flex items-center gap-4 font-ui text-xs font-bold text-white/70">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: CORRECT_GREEN }} />
          {t("coverageLegendCorrect", { count: correct })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: INCORRECT_RED }} />
          {t("coverageLegendIncorrect", { count: incorrect })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: "rgba(255,255,255,.3)" }} />
          {t("coverageLegendNotSeen", { count: notSeen })}
        </span>
      </div>
    </div>
  );
}
