import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { getCalculatorCategories, getAllCalculators } from "@/lib/clinical-tools";
import { getFavoritedCalculatorIds, getRecentUsageCounts } from "@/lib/workspace";
import { ClinicalToolsBrowser } from "@/components/clinical-tools/ClinicalToolsBrowser";

// The browse/search part is public (a reference tool, not personal
// data, unlike the session-gated Study Planner) — only favoriting
// itself needs a session, so this still doesn't gate the whole page
// the way Study Planner does.
export default async function ClinicalToolsPage() {
  const locale = await getLocale();
  const session = await auth();
  const [categories, calculators, favoritedIds, usageCounts] = await Promise.all([
    getCalculatorCategories(),
    getAllCalculators(locale),
    session ? getFavoritedCalculatorIds(session.user.id) : Promise.resolve(new Set<string>()),
    session ? getRecentUsageCounts(session.user.id) : Promise.resolve(new Map<string, number>()),
  ]);
  const t = await getTranslations("clinicalTools");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-heading text-3xl font-black text-primary">{t("pageTitle")}</h1>
        <p className="mt-1 font-ui text-sm text-secondary">{t("pageSubtitle")}</p>
      </div>
      <ClinicalToolsBrowser
        categories={categories}
        calculators={calculators}
        favoritedIds={favoritedIds}
        usageCounts={usageCounts}
        isSignedIn={Boolean(session)}
      />
    </main>
  );
}
