import { getTranslations } from "next-intl/server";
import { ListChecks, HelpCircle, Target, Repeat } from "lucide-react";
import { auth } from "@/auth";
import {
  getCategories,
  getUnfiledSets,
  getDashboardStats,
  getQuestionBankFolderTiles,
  groupFoldersBySubject,
  getQuestionBankProgress,
  getQuestionBankStreak,
} from "@/lib/question-bank";
import { getSubjects } from "@/lib/flashcards";
import { getActiveSession } from "@/lib/question-bank-session";
import { QuestionBankBrowser } from "@/components/question-bank/QuestionBankBrowser";
import { QuestionBankFolderGrid } from "@/components/question-bank/QuestionBankFolderGrid";
import { QuestionBankProgressPanels } from "@/components/question-bank/QuestionBankProgressPanels";
import { QuestionBankSessionPanel } from "@/components/question-bank/QuestionBankSessionPanel";

// Public browse, same idiom as Flashcards/Clinical Tools — folders and
// sets are reference content anyone can look at and click through;
// only answering a question (recordAttemptAction) needs a session.
//
// QBANK-IMPLEMENTATION.md Pass 2 — the dashboard. todayYmd here is the
// server's own UTC calendar day, same deliberate simplification
// flashcards/page.tsx's own comment explains (streak bucketing can be
// off by one right around a user's local midnight; self-corrects next
// load).
export default async function QuestionBankPage() {
  const session = await auth();
  const userId = session?.user.id ?? null;
  const todayYmd = new Date().toISOString().slice(0, 10);
  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  const t = await getTranslations("questionBank");

  const [categories, unfiledSets, stats, folderTiles, subjects, progress, streak, activeSession] = await Promise.all([
    getCategories(),
    getUnfiledSets(userId),
    getDashboardStats(userId),
    getQuestionBankFolderTiles(userId),
    getSubjects(),
    userId ? getQuestionBankProgress(userId, todayYmd) : Promise.resolve(null),
    userId ? getQuestionBankStreak(userId, todayYmd) : Promise.resolve(0),
    userId ? getActiveSession(userId) : Promise.resolve(null),
  ]);
  const folderGroups = groupFoldersBySubject(folderTiles, subjects);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <ListChecks className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-heading text-3xl text-primary">{t("pageTitle")}</h1>
            <p className="mt-1 font-ui text-sm text-secondary">{t("pageSubtitle")}</p>
          </div>
        </div>

        {session && progress ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={HelpCircle} value={progress.answered} label={t("statsAnswered")} />
            <StatTile icon={Target} value={progress.accuracyPercent ?? 0} label={t("statsAccuracy")} suffix="%" />
            <StatTile icon={Repeat} value={progress.incorrect} label={t("statsToReview")} />
            <StatTile icon={ListChecks} value={streak} label={t("statsStreak")} />
          </div>
        ) : (
          // Signed out, or signed in but nothing answered yet — nothing
          // personal to show (never a fabricated 0% accuracy/streak),
          // so this falls back to the same plain totals a visitor sees.
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={HelpCircle} value={stats.totalQuestions} label={t("statsTotalQuestions")} />
            <StatTile icon={ListChecks} value={stats.totalSets} label={t("statsQuestionSets")} />
          </div>
        )}
      </div>

      {session && <QuestionBankSessionPanel activeSession={activeSession} notSeenCount={progress?.notSeen ?? stats.totalQuestions} />}

      <QuestionBankFolderGrid groups={folderGroups} />

      {progress && <QuestionBankProgressPanels progress={progress} streak={streak} />}

      <QuestionBankBrowser categories={categories} unfiledSets={unfiledSets} isEditor={isEditor} />
    </main>
  );
}

function StatTile({
  icon: Icon,
  value,
  label,
  suffix,
}: {
  icon: typeof ListChecks;
  value: number;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-card p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <span className="font-heading text-xl font-semibold text-primary tabular-nums">
          {value}
          {suffix}
        </span>
        <span className="font-ui text-xs text-secondary">{label}</span>
      </div>
    </div>
  );
}
