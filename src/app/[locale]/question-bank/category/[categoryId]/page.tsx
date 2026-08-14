import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getCategoryWithSets, getCategories } from "@/lib/question-bank";
import { QuestionSetTable } from "@/components/question-bank/QuestionSetTable";
import { CategoryHeader } from "@/components/question-bank/CategoryHeader";
import { NewQuestionSetButton } from "@/components/question-bank/NewQuestionSetButton";

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

// Every folder is public browsing (no ownership branch, unlike
// Flashcards' user-folder 404 case) — only mutation controls are
// gated, via canManage below.
export default async function QuestionBankCategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  const session = await auth();
  const result = await getCategoryWithSets(categoryId, session?.user.id ?? null);
  if (!result) notFound();
  const { category, sets } = result;

  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  const allCategories = isEditor ? await getCategories() : [];
  const t = await getTranslations("questionBank");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
      <Link href="/question-bank" className="font-ui text-sm text-secondary hover:text-accent">
        {t("backToQuestionBank")}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CategoryHeader category={category} canManage={isEditor} />
        {isEditor && <NewQuestionSetButton categories={allCategories} defaultCategoryId={category.id} />}
      </div>

      {sets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">
          {t("noSetsInFolder")}
        </p>
      ) : (
        <QuestionSetTable sets={sets} />
      )}
    </main>
  );
}
