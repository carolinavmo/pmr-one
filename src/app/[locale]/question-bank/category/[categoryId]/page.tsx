import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Lock } from "lucide-react";
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
  const canBrowseFolder = category.isPublic || Boolean(session);
  const t = await getTranslations("questionBank");
  const tCommon = await getTranslations("common");
  const tAuth = await getTranslations("auth");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
      <Link href="/question-bank" className="font-ui text-sm text-secondary hover:text-accent">
        {t("backToQuestionBank")}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CategoryHeader category={category} canManage={isEditor} />
        {isEditor && <NewQuestionSetButton categories={allCategories} defaultCategoryId={category.id} />}
      </div>

      {!canBrowseFolder ? (
        <div className="flex items-start gap-3 rounded-xl border border-insight/30 bg-insight/5 p-4">
          <Lock className="mt-0.5 size-5 shrink-0 text-insight" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <h3 className="font-ui text-sm font-semibold text-primary">{t("membersOnlyHeading")}</h3>
            <p className="font-ui text-sm text-secondary">{t("membersOnlyBody")}</p>
            <div className="mt-1 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-accent px-4 py-2 font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover"
              >
                {tCommon("signIn")}
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-border px-4 py-2 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-border/20"
              >
                {tAuth("createAccountButton")}
              </Link>
            </div>
          </div>
        </div>
      ) : sets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">
          {t("noSetsInFolder")}
        </p>
      ) : (
        <QuestionSetTable sets={sets} />
      )}
    </main>
  );
}
