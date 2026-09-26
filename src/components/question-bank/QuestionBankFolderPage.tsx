"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { HelpCircle, Target, Flag, Clock, Plus } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { restartSetAction } from "@/lib/actions/question-bank";
import { startSessionAction } from "@/lib/actions/question-bank-session";
import { DEFAULT_SESSION_SIZE } from "@/lib/question-bank-session-constants";
import type { QuestionCategory, QuestionSetSummary, FolderQuestionRow, WorthRevisitingRow } from "@/lib/question-bank";
import { QuestionBankFolderHeader } from "./QuestionBankFolderHeader";
import { NewQuestionSetDrawer } from "./NewQuestionSetDrawer";
import { QBANK_FOLDER_COLOR_ACCENT, type QbankFolderColor } from "@/lib/qbank-folder-colors";

type FolderTab = "topics" | "all" | "incorrect" | "statistics";

// QBANK-IMPLEMENTATION.md Pass 3 — "the folder page." Owns tab state
// (same split TopicPageClient.tsx uses in Flashcards: a thin client
// wrapper around server-fetched data) so the header's "I got wrong" /
// "not seen" actions can jump straight to the relevant tab instead of
// navigating away.
export function QuestionBankFolderPage({
  category,
  sets,
  allQuestions,
  flaggedCount,
  worthRevisiting,
  canManage,
  allCategories,
}: {
  category: QuestionCategory;
  sets: QuestionSetSummary[];
  allQuestions: FolderQuestionRow[];
  flaggedCount: number;
  worthRevisiting: WorthRevisitingRow[];
  canManage: boolean;
  allCategories: QuestionCategory[];
}) {
  const t = useTranslations("questionBank");
  const format = useFormatter();
  const router = useRouter();
  const [tab, setTab] = useState<FolderTab>("topics");
  const [newSetOpen, setNewSetOpen] = useState(false);
  const [, startTransition] = useTransition();

  const totalQuestions = sets.reduce((sum, s) => sum + s.questionCount, 0);
  const correct = sets.reduce((sum, s) => sum + s.yourCorrect, 0);
  const wrong = sets.reduce((sum, s) => sum + (s.yourAttempts - s.yourCorrect), 0);
  const notSeen = totalQuestions - correct - wrong;
  const accuracyPercent = correct + wrong === 0 ? null : Math.round((correct / (correct + wrong)) * 100);
  const lastPractisedAt = sets.reduce<string | null>((latest, s) => (s.lastAnsweredAt && (!latest || s.lastAnsweredAt > latest) ? s.lastAnsweredAt : latest), null);
  const incorrectQuestions = allQuestions.filter((q) => q.status === "incorrect");

  function handleStartFolder() {
    startTransition(async () => {
      const sessionId = await startSessionAction("tutor", { filter: "folder", folderId: category.id, size: DEFAULT_SESSION_SIZE });
      if (sessionId) router.push(`/question-bank/session/${sessionId}`);
    });
  }

  const tabs: { key: FolderTab; label: string }[] = [
    { key: "topics", label: t("tabTopics", { count: sets.length }) },
    { key: "all", label: t("tabAllQuestions", { count: totalQuestions }) },
    { key: "incorrect", label: t("tabMyIncorrect", { count: wrong }) },
    { key: "statistics", label: t("tabStatistics") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <QuestionBankFolderHeader
        category={category}
        canManage={canManage}
        correct={correct}
        wrong={wrong}
        notSeen={notSeen}
        onStartFolder={handleStartFolder}
        onShowIncorrect={() => setTab("incorrect")}
        onShowTopics={() => setTab("topics")}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile icon={HelpCircle} value={totalQuestions} label={t("mQuestions")} />
        <MetricTile icon={Target} value={accuracyPercent === null ? "—" : `${accuracyPercent}%`} label={t("mYourAccuracy")} />
        <MetricTile icon={Flag} value={flaggedCount} label={t("mFlagged")} />
        <MetricTile icon={Clock} value={lastPractisedAt ? format.dateTime(new Date(lastPractisedAt), { month: "short", day: "numeric" }) : "—"} label={t("mLastPractised")} />
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => setTab(tabItem.key)}
            className={`-mb-px border-b-[3px] px-3.5 py-2.5 font-ui text-[13.5px] font-bold ${
              tab === tabItem.key ? "border-accent text-navy" : "border-transparent text-secondary hover:text-navy"
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === "topics" && (
        <div className="flex flex-col gap-2">
          {sets.map((set) => (
            <TopicRow key={set.id} set={set} colourKey={category.colourKey} />
          ))}
          {canManage && (
            <button
              type="button"
              onClick={() => setNewSetOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-[13px] border border-dashed border-border py-3.5 font-ui text-sm font-bold text-secondary hover:border-accent hover:text-accent"
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("newTopicInFolder", { folder: category.name })}
            </button>
          )}
        </div>
      )}

      {tab === "all" && <QuestionListTab questions={allQuestions} />}
      {tab === "incorrect" && <QuestionListTab questions={incorrectQuestions} />}
      {tab === "statistics" && <StatisticsTab sets={sets} colourKey={category.colourKey} />}

      {worthRevisiting.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-heading text-lg font-black text-navy">{t("worthRevisiting")}</h2>
            <span className="font-ui text-xs font-bold text-secondary">{t("worthRevisitingSubtitle")}</span>
          </div>
          <div className="flex flex-col gap-2">
            {worthRevisiting.map((row) => (
              <div key={row.id} className="flex items-center gap-3.5 rounded-[13px] border border-border p-3.5">
                <span className="h-[38px] w-[9px] shrink-0 rounded-[5px]" style={{ backgroundColor: "var(--color-warning)" }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-sm font-bold text-navy">&ldquo;{row.prompt}&rdquo;</p>
                  <p className="font-ui text-xs font-bold text-secondary">{t("worthRevisitingMeta", { set: row.setName, count: row.wrongCount })}</p>
                </div>
                <Link href={`/question-bank/set/${row.setId}`} className="shrink-0 rounded-lg border border-border px-3.5 py-2 font-ui text-xs font-bold text-secondary hover:bg-surface-raised">
                  {t("review")}
                </Link>
                <Link href={`/question-bank/set/${row.setId}`} className="shrink-0 rounded-lg bg-accent px-3.5 py-2 font-ui text-xs font-bold text-white hover:bg-accent-hover">
                  {t("practise")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <NewQuestionSetDrawer open={newSetOpen} onClose={() => setNewSetOpen(false)} categories={allCategories} defaultCategoryId={category.id} />
    </div>
  );
}

function MetricTile({ icon: Icon, value, label }: { icon: typeof HelpCircle; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <span className="font-heading text-xl font-black text-navy tabular-nums">{value}</span>
        <span className="font-ui text-xs text-secondary">{label}</span>
      </div>
    </div>
  );
}

function TopicRow({ set, colourKey }: { set: QuestionSetSummary; colourKey: QbankFolderColor }) {
  const t = useTranslations("questionBank");
  const router = useRouter();
  const [isPending, setPending] = useState(false);
  const wrong = set.yourAttempts - set.yourCorrect;
  const notSeen = set.questionCount - set.yourAttempts;
  const accent = QBANK_FOLDER_COLOR_ACCENT[colourKey];

  async function handleRetake() {
    setPending(true);
    await restartSetAction(set.id);
    router.push(`/question-bank/set/${set.id}`);
  }

  const state: "start" | "continue" | "retake" = set.yourAttempts === 0 ? "start" : set.yourAttempts < set.questionCount ? "continue" : "retake";

  return (
    <div className="flex items-center gap-3.5 rounded-[13px] border border-border p-3.5">
      <span className="h-[38px] w-[9px] shrink-0 rounded-[5px]" style={{ backgroundColor: accent }} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-ui text-[15px] font-black text-navy">{set.name}</p>
        <p className="font-ui text-[11.5px] font-bold text-secondary">
          {set.yourAttempts === 0
            ? t("questionCountFromLibrary", { count: set.questionCount })
            : t("questionsLeftToAnswer", { total: set.questionCount, left: notSeen })}
        </p>
      </div>
      <div className="w-[140px] shrink-0">
        <div className="flex h-2 overflow-hidden rounded-full bg-[#EEF1F5]">
          <div className="h-2" style={{ width: `${(set.yourCorrect / set.questionCount) * 100}%`, backgroundColor: "var(--color-trust)" }} />
          <div className="h-2" style={{ width: `${(wrong / set.questionCount) * 100}%`, backgroundColor: "var(--color-warning)" }} />
        </div>
        <span className="mt-1 block font-ui text-[11px] font-bold text-secondary">{t("answeredOfTotal", { answered: set.yourAttempts, total: set.questionCount })}</span>
      </div>
      <span className="w-[46px] shrink-0 text-right font-ui text-sm font-black" style={{ color: set.yourScore === null ? "var(--color-secondary)" : accent }}>
        {set.yourScore === null ? "—" : `${set.yourScore}%`}
      </span>
      {state === "retake" ? (
        <button type="button" onClick={handleRetake} disabled={isPending} className="shrink-0 rounded-lg border border-border px-3.5 py-2 font-ui text-xs font-bold text-secondary hover:bg-surface-raised disabled:opacity-60">
          {t("startOver")}
        </button>
      ) : (
        <Link href={`/question-bank/set/${set.id}`} className="shrink-0 rounded-lg bg-accent px-3.5 py-2 font-ui text-xs font-bold text-white hover:bg-accent-hover">
          {state === "start" ? t("start") : t("continue")}
        </Link>
      )}
    </div>
  );
}

function QuestionListTab({ questions }: { questions: FolderQuestionRow[] }) {
  const t = useTranslations("questionBank");

  if (questions.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">{t("noQuestionsHere")}</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
      {questions.map((q) => (
        <div key={q.id} className="flex items-center gap-3 p-3.5">
          <StatusDot status={q.status} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-ui text-sm font-bold text-navy">{q.prompt}</p>
            <p className="font-ui text-xs text-secondary">{q.setName}</p>
          </div>
          <Link href={`/question-bank/set/${q.setId}`} className="shrink-0 font-ui text-xs font-bold text-accent hover:text-accent-hover">
            {t("openSet")}
          </Link>
        </div>
      ))}
    </div>
  );
}

function StatusDot({ status }: { status: FolderQuestionRow["status"] }) {
  const color = status === "correct" ? "var(--color-trust)" : status === "incorrect" ? "var(--color-warning)" : "#C6CED8";
  return <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />;
}

function StatisticsTab({ sets, colourKey }: { sets: QuestionSetSummary[]; colourKey: QbankFolderColor }) {
  const t = useTranslations("questionBank");
  const accent = QBANK_FOLDER_COLOR_ACCENT[colourKey];
  const sorted = [...sets].filter((s) => s.yourScore !== null).sort((a, b) => (a.yourScore ?? 0) - (b.yourScore ?? 0));

  if (sorted.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">{t("noStatisticsYet")}</p>;
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <span className="font-ui text-[9.5px] font-black tracking-[1.3px] text-secondary uppercase">{t("statisticsByTopic")}</span>
      {sorted.map((set) => (
        <div key={set.id} className="flex items-center gap-3 border-t border-[#F0F2F5] py-2.5 first:border-t-0">
          <span className="min-w-0 flex-1 truncate font-ui text-sm font-bold text-navy">{set.name}</span>
          <div className="h-2 w-[120px] overflow-hidden rounded-full bg-[#EEF1F5]">
            <div className="h-2" style={{ width: `${set.yourScore}%`, backgroundColor: accent }} />
          </div>
          <span className="w-[42px] shrink-0 text-right font-ui text-sm font-black" style={{ color: accent }}>
            {set.yourScore}%
          </span>
        </div>
      ))}
    </div>
  );
}
