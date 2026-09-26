"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { QuestionBankProgress } from "@/lib/question-bank";
import { QBANK_FOLDER_COLOR_ACCENT } from "@/lib/qbank-folder-colors";
import { KnownPercentRing } from "@/components/flashcards/KnownPercentRing";

const QBANK_PROGRESS_WEEKS = 12;

// "Your progress" (QBANK-IMPLEMENTATION.md Pass 2) — three panels:
// overall accuracy, questions answered, weakest folders. Same "hide
// rather than show a fabricated zero" rule as Flashcards' own progress
// panels — the whole section only renders once getQuestionBankProgress
// has returned non-null (the caller already gates this).
export function QuestionBankProgressPanels({ progress, streak }: { progress: QuestionBankProgress; streak: number }) {
  const t = useTranslations("questionBank");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-black text-navy">{t("yourProgress")}</h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AccuracyPanel progress={progress} />
        <VolumePanel progress={progress} streak={streak} />
        <WeakestFoldersPanel progress={progress} />
      </div>
    </div>
  );
}

function AccuracyPanel({ progress }: { progress: QuestionBankProgress }) {
  const t = useTranslations("questionBank");
  const correct = progress.accuracyPercent === null ? 0 : Math.round((progress.accuracyPercent / 100) * progress.answered);

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-4">
      <span className="font-ui text-[9.5px] font-black tracking-[1.3px] text-secondary uppercase">{t("panelOverallAccuracy")}</span>

      <div className="flex items-center gap-4">
        <KnownPercentRing percent={progress.accuracyPercent ?? 0} size={100} sublabel={t("accuracy")} />
        <div className="flex flex-col gap-1">
          <span className="font-heading text-[19px] font-black text-navy">{t("answeredCorrectlyOfTotal", { correct, total: progress.answered })}</span>
          <span className="font-ui text-[12.5px] text-secondary">{t("answeredCorrectlyLabel")}</span>
        </div>
      </div>

      <div className="flex gap-4 border-t border-[#F0F2F5] pt-3">
        <div>
          <span className="block font-heading text-[17px] font-black text-warning">{progress.incorrect}</span>
          <span className="font-ui text-[11px] font-bold text-secondary">{t("toReviewLabel")}</span>
        </div>
        <div>
          <span className="block font-heading text-[17px] font-black text-navy">{progress.notSeen}</span>
          <span className="font-ui text-[11px] font-bold text-secondary">{t("notSeenLabel")}</span>
        </div>
      </div>
    </div>
  );
}

function VolumePanel({ progress, streak }: { progress: QuestionBankProgress; streak: number }) {
  const t = useTranslations("questionBank");
  const max = Math.max(1, ...progress.weeklyCounts);
  const totalThisWindow = progress.weeklyCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-4">
      <span className="font-ui text-[9.5px] font-black tracking-[1.3px] text-secondary uppercase">{t("panelQuestionsAnswered", { count: QBANK_PROGRESS_WEEKS })}</span>

      <div className="flex h-[72px] items-end gap-[3px]">
        {progress.weeklyCounts.map((count, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${Math.max(4, (count / max) * 100)}%`, backgroundColor: i === progress.weeklyCounts.length - 1 ? "var(--color-acc)" : "var(--color-acc-dk)" }}
          />
        ))}
      </div>
      <div className="flex justify-between font-ui text-[10.5px] font-bold text-secondary">
        <span>{t("weeksAgoAxis", { count: QBANK_PROGRESS_WEEKS })}</span>
        <span>{t("thisWeekAxis")}</span>
      </div>

      <div className="flex gap-4 border-t border-[#F0F2F5] pt-3">
        <div>
          <span className="block font-heading text-[17px] font-black text-navy">{totalThisWindow}</span>
          <span className="font-ui text-[11px] font-bold text-secondary">{t("answeredTotalStat")}</span>
        </div>
        <div>
          <span className="block font-heading text-[17px] font-black text-navy">{progress.weeklyAverage}</span>
          <span className="font-ui text-[11px] font-bold text-secondary">{t("answeredWeeklyAvgStat")}</span>
        </div>
        <div>
          <span className="block font-heading text-[17px] font-black text-navy">{streak}</span>
          <span className="font-ui text-[11px] font-bold text-secondary">{t("streakLabel")}</span>
        </div>
      </div>
    </div>
  );
}

function WeakestFoldersPanel({ progress }: { progress: QuestionBankProgress }) {
  const t = useTranslations("questionBank");
  const weakest = progress.weakestFolders[0];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <span className="font-ui text-[9.5px] font-black tracking-[1.3px] text-secondary uppercase">{t("panelWeakestFolders")}</span>

      {progress.weakestFolders.length === 0 ? (
        <p className="font-ui text-sm text-secondary">{t("notEnoughDataYet")}</p>
      ) : (
        <div className="flex flex-col">
          {progress.weakestFolders.map((folder) => (
            <div key={folder.id} className="flex items-center gap-2.5 border-t border-[#F0F2F5] py-2 font-ui text-[13.5px] first:border-t-0">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: QBANK_FOLDER_COLOR_ACCENT[folder.colourKey] }} />
              <span className="flex-1 truncate font-bold text-navy">{folder.name}</span>
              <span className="font-black" style={{ color: QBANK_FOLDER_COLOR_ACCENT[folder.colourKey] }}>
                {folder.accuracyPercent}%
              </span>
            </div>
          ))}
        </div>
      )}

      {weakest && (
        <Link href={`/question-bank/category/${weakest.id}`} className="mt-2 self-start font-ui text-xs font-black text-accent hover:text-accent-hover">
          {t("practiseWeakest")}
        </Link>
      )}
    </div>
  );
}
