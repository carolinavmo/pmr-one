import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Clock, ListChecks, Users } from "lucide-react";
import { getCalculatorBySlug } from "@/lib/clinical-tools";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import { CalculatorRunner } from "@/components/clinical-tools/CalculatorRunner";
import { Link } from "@/i18n/navigation";

interface CalculatorPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CalculatorPage({ params }: CalculatorPageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const calculator = await getCalculatorBySlug(slug, locale);
  if (!calculator) notFound();

  const t = await getTranslations("clinicalTools");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <Link
          href="/clinical-tools"
          className="w-fit font-ui text-sm text-secondary transition-colors duration-base hover:text-accent"
        >
          {t("backToAll")}
        </Link>
        <span
          className={`w-fit rounded-full px-2.5 py-1 font-ui text-xs font-semibold tracking-wide uppercase ${CARD_COLOR_CHIP[calculator.categoryColor]}`}
        >
          {calculator.categoryName}
        </span>
        <h1 className="font-reading text-3xl text-primary">
          {calculator.name}
          {calculator.abbreviation && (
            <span className="ml-2 font-ui text-lg text-secondary">({calculator.abbreviation})</span>
          )}
        </h1>
        <p className="font-ui text-sm text-secondary">{calculator.description}</p>
        <div className="mt-1 flex flex-wrap items-center gap-4 font-ui text-xs text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="size-3.5" aria-hidden="true" />
            {t("itemCount", { count: calculator.itemCount })}
          </span>
          {calculator.estimatedMinutesMin && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden="true" />
              {calculator.estimatedMinutesMax && calculator.estimatedMinutesMax !== calculator.estimatedMinutesMin
                ? t("estimatedMinutesRange", {
                    min: calculator.estimatedMinutesMin,
                    max: calculator.estimatedMinutesMax,
                  })
                : t("estimatedMinutes", { minutes: calculator.estimatedMinutesMin })}
            </span>
          )}
          {calculator.population && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden="true" />
              {calculator.population}
            </span>
          )}
        </div>
      </div>

      <CalculatorRunner calculator={calculator} />
    </main>
  );
}
