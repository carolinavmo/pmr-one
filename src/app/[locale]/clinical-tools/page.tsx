import { getTranslations, getLocale } from "next-intl/server";
import { getCalculatorCategories, getAllCalculators } from "@/lib/clinical-tools";
import { ClinicalToolsBrowser } from "@/components/clinical-tools/ClinicalToolsBrowser";

// Public — no auth check, matching disease pages (a reference tool,
// not personal data), unlike the session-gated Study Planner.
export default async function ClinicalToolsPage() {
  const locale = await getLocale();
  const [categories, calculators] = await Promise.all([
    getCalculatorCategories(),
    getAllCalculators(locale),
  ]);
  const t = await getTranslations("clinicalTools");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-reading text-3xl text-primary">{t("pageTitle")}</h1>
        <p className="mt-1 font-ui text-sm text-secondary">{t("pageSubtitle")}</p>
      </div>
      <ClinicalToolsBrowser categories={categories} calculators={calculators} />
    </main>
  );
}
