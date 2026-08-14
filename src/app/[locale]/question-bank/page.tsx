import { getTranslations } from "next-intl/server";
import { ListChecks, HelpCircle, Target, Repeat } from "lucide-react";
import { auth } from "@/auth";
import { getCategories, getUnfiledSets, getDashboardStats } from "@/lib/question-bank";
import { QuestionBankBrowser } from "@/components/question-bank/QuestionBankBrowser";

// Public browse, same idiom as Flashcards/Clinical Tools — folders and
// sets are reference content anyone can look at and click through;
// only answering a question (recordAttemptAction) needs a session.
export default async function QuestionBankPage() {
  const session = await auth();
  const userId = session?.user.id ?? null;
  const categories = await getCategories();
  const unfiledSets = await getUnfiledSets(userId);
  const stats = await getDashboardStats(userId);
  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  const t = await getTranslations("questionBank");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <ListChecks className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-heading text-3xl text-primary">{t("pageTitle")}</h1>
          <p className="mt-1 font-ui text-sm text-secondary">{t("pageSubtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={HelpCircle} value={stats.totalQuestions} label={t("statsTotalQuestions")} />
        <StatTile icon={ListChecks} value={stats.totalSets} label={t("statsQuestionSets")} />
        {session && (
          <>
            <StatTile icon={Target} value={stats.yourAverageScore ?? 0} label={t("statsYourScore")} suffix="%" />
            <StatTile icon={Repeat} value={stats.yourAttempts} label={t("statsYourAttempts")} />
          </>
        )}
      </div>

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
