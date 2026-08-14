import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getSetWithQuestions, getQuestionsForManagement } from "@/lib/question-bank";
import { QuestionRunner } from "@/components/question-bank/QuestionRunner";
import { QuestionManager } from "@/components/question-bank/QuestionManager";

interface SetPageProps {
  params: Promise<{ setId: string }>;
}

// Public browsing/answering (same idiom as Flashcards' deck detail) —
// getSetWithQuestions always returns the answer-leak-safe shape
// described in this feature's plan file and question-bank.ts's own
// header comment. Editors additionally get the full authoring data
// (getQuestionsForManagement) rendered below the runner — same
// "both shown together, not toggled" idiom Flashcards' DeckWorkspace
// uses for CardManager + FlashcardReviewer, except the two don't share
// live state here (see QuestionManager's own header comment for why).
export default async function QuestionBankSetPage({ params }: SetPageProps) {
  const { setId } = await params;
  const session = await auth();
  const set = await getSetWithQuestions(setId, session?.user.id ?? null);
  if (!set) notFound();

  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  const managedQuestions = isEditor ? await getQuestionsForManagement(set.id) : [];
  const t = await getTranslations("questionBank");

  const backHref = set.categoryId ? `/question-bank/category/${set.categoryId}` : "/question-bank";
  const backLabel = set.categoryId ? t("backToSets") : t("backToQuestionBank");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-16">
      <Link href={backHref} className="font-ui text-sm text-secondary hover:text-accent">
        {backLabel}
      </Link>

      <div>
        <h1 className="font-heading text-2xl text-primary">{set.name}</h1>
        {set.description && <p className="mt-1 font-ui text-sm text-secondary">{set.description}</p>}
      </div>

      <QuestionRunner set={set} isSignedIn={Boolean(session)} />

      {isEditor && <QuestionManager setId={set.id} initialQuestions={managedQuestions} />}
    </main>
  );
}
