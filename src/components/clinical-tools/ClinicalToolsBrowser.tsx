"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Star, Lock } from "lucide-react";
import type { CalculatorCategory, CalculatorSummary } from "@/lib/clinical-tools";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import { KnowledgeObjectCard } from "@/components/ui/KnowledgeObjectCard";
import { toggleCalculatorFavoriteAction } from "@/lib/actions/workspace";

// Server-fetched data handed down as props (same "page.tsx fetches,
// one client component owns the interactive part" split
// StudyPlannerBoard already uses) — the calculator list is small
// enough that filtering happens entirely client-side against the
// already-fetched array, no separate search API route.
export function ClinicalToolsBrowser({
  categories,
  calculators,
  favoritedIds,
  isSignedIn,
}: {
  categories: CalculatorCategory[];
  calculators: CalculatorSummary[];
  favoritedIds: Set<string>;
  isSignedIn: boolean;
}) {
  const t = useTranslations("clinicalTools");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return calculators;
    return calculators.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.abbreviation?.toLowerCase().includes(q) ?? false) ||
        c.description.toLowerCase().includes(q)
    );
  }, [calculators, query]);

  const favorited = useMemo(
    () => filtered.filter((c) => favoritedIds.has(c.id)),
    [filtered, favoritedIds]
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-secondary"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-full border border-border bg-surface-raised py-2.5 pr-4 pl-10 font-ui text-sm text-primary outline-none focus:border-accent"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="font-ui text-sm text-secondary">{t("noResults")}</p>
      ) : (
        <>
          {isSignedIn && favorited.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 font-ui text-xs font-semibold tracking-wide uppercase ${CARD_COLOR_CHIP.yellow}`}
                >
                  {t("favouritesHeading")}
                </span>
                <span className="font-ui text-xs text-secondary">
                  {t("calculatorCount", { count: favorited.length })}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {favorited.map((calculator) => {
                  const category = categories.find((c) => c.slug === calculator.categorySlug);
                  return (
                    <CalculatorCard
                      key={calculator.id}
                      calculator={calculator}
                      categoryColor={category?.color}
                      isFavorited
                      isSignedIn={isSignedIn}
                      t={t}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {categories.map((category) => {
            const categoryCalculators = filtered.filter((c) => c.categorySlug === category.slug);
            if (categoryCalculators.length === 0) return null;
            return (
              <div key={category.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 font-ui text-xs font-semibold tracking-wide uppercase ${CARD_COLOR_CHIP[category.color]}`}
                  >
                    {category.name}
                  </span>
                  <span className="font-ui text-xs text-secondary">
                    {t("calculatorCount", { count: categoryCalculators.length })}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryCalculators.map((calculator) => (
                    <CalculatorCard
                      key={calculator.id}
                      calculator={calculator}
                      categoryColor={category.color}
                      isFavorited={favoritedIds.has(calculator.id)}
                      isSignedIn={isSignedIn}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// The star sits as a sibling overlay, not nested inside
// KnowledgeObjectCard's own <Link> — an <a> can't legally contain a
// <button>/<form>, and clicking the star would also trigger the
// card's navigation. Absolutely positioning it over the card's own
// top-right corner keeps the whole card clickable everywhere except
// that one corner.
function CalculatorCard({
  calculator,
  categoryColor,
  isFavorited,
  isSignedIn,
  t,
}: {
  calculator: CalculatorSummary;
  categoryColor?: CalculatorCategory["color"];
  isFavorited: boolean;
  isSignedIn: boolean;
  t: ReturnType<typeof useTranslations<"clinicalTools">>;
}) {
  const isLocked = !calculator.isPublic && !isSignedIn;

  return (
    <div className="relative">
      <div className={isLocked ? "opacity-60" : undefined}>
        <KnowledgeObjectCard
          type="clinical_calculator"
          title={calculator.abbreviation ? `${calculator.abbreviation} - ${calculator.name}` : calculator.name}
          context={calculator.description}
          href={`/clinical-tools/${calculator.slug}`}
          categoryColor={categoryColor}
        />
      </div>
      {isLocked && (
        <span
          className="absolute top-3 left-3 z-10 flex size-7 items-center justify-center rounded-full bg-surface/80 text-secondary backdrop-blur-sm"
          title={t("membersOnly")}
        >
          <Lock className="size-3.5" aria-hidden="true" />
        </span>
      )}
      {isSignedIn && (
        <form action={toggleCalculatorFavoriteAction} className="absolute top-3 right-3 z-10">
          <input type="hidden" name="calculatorId" value={calculator.id} />
          <button
            type="submit"
            aria-pressed={isFavorited}
            aria-label={isFavorited ? t("removeFromFavourites") : t("addToFavourites")}
            className={`flex size-7 items-center justify-center rounded-full bg-surface/80 backdrop-blur-sm transition-colors duration-base ${
              isFavorited ? "text-card-yellow" : "text-secondary hover:text-card-yellow"
            }`}
          >
            <Star className="size-4" fill={isFavorited ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  );
}
