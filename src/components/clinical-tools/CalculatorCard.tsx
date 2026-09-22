"use client";

import { Star, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { CalculatorSummary } from "@/lib/clinical-tools";
import { toggleCalculatorFavoriteAction } from "@/lib/actions/workspace";

// TOOLS-DASHBOARD-SPEC.md's "Card" — replaces the generic
// KnowledgeObjectCard for this one object type (its 5-slot skeleton
// has no room for an abbreviation chip, a clamped-not-truncated
// description with a reserved min-height, a category-colored meta
// line, or the population hairline this card needs). Colored entirely
// through `data-category` + the --c/--tint/--bd tokens
// (globals.css) — nothing here hard-codes a hex per category.
export function CalculatorCard({
  calculator,
  isFavorited,
  isSignedIn,
  usageCount = 0,
}: {
  calculator: CalculatorSummary;
  isFavorited: boolean;
  isSignedIn: boolean;
  // "show 'Used N× this week' only above 2 uses in the last 7 days"
  // (Pass 4) — the >2 threshold check lives here, not in the caller.
  usageCount?: number;
}) {
  const t = useTranslations("clinicalTools");
  const isLocked = !calculator.isPublic && !isSignedIn;

  const timeLabel =
    calculator.estimatedMinutesMin != null && calculator.estimatedMinutesMax != null
      ? calculator.estimatedMinutesMin === calculator.estimatedMinutesMax
        ? t("estimatedMinutes", { minutes: calculator.estimatedMinutesMin })
        : t("estimatedMinutesRange", {
            min: calculator.estimatedMinutesMin,
            max: calculator.estimatedMinutesMax,
          })
      : null;

  return (
    <div
      data-category={calculator.categorySlug}
      className="relative flex h-full flex-col rounded-2xl border p-4 pb-3.5 transition-shadow duration-base hover:shadow-[0_8px_20px_rgba(20,40,74,0.10)]"
      style={{ background: "var(--tint)", borderColor: "var(--bd)" }}
    >
      <Link href={`/clinical-tools/${calculator.slug}`} className="flex min-w-0 flex-1 flex-col">
        <span className="mb-2.5 flex items-center">
          {calculator.abbreviation && (
            <span
              className="rounded-[7px] px-2.5 py-1 font-ui text-[11px] font-black tracking-[0.6px] text-white"
              style={{ background: "var(--c)" }}
            >
              {calculator.abbreviation}
            </span>
          )}
        </span>

        <span className="block font-ui text-base font-black leading-[1.25] tracking-[-0.2px] text-navy">
          {calculator.name}
        </span>
        <span className="mt-1.5 line-clamp-2 min-h-[39px] font-ui text-[13px] leading-[1.5] text-secondary">
          {calculator.description}
        </span>

        {(calculator.itemCount > 0 || timeLabel) && (
          <span
            className="mt-2.5 flex flex-wrap items-center gap-2.5 font-ui text-[11.5px] font-extrabold"
            style={{ color: "var(--c)" }}
          >
            <span>▤ {calculator.itemCount > 0 ? t("itemCount", { count: calculator.itemCount }) : t("fullExam")}</span>
            {timeLabel && <span>◷ {timeLabel}</span>}
            {usageCount > 2 && (
              <span
                className="rounded-[5px] border px-1.5 py-0.5 font-ui text-[10.5px] font-black"
                style={{ borderColor: "var(--bd)", background: "var(--color-surface)" }}
              >
                {t("usedThisWeek", { count: usageCount })}
              </span>
            )}
          </span>
        )}

        {calculator.population && (
          <span
            className="mt-2.5 border-t pt-2.5 font-ui text-[11.5px] text-secondary opacity-80"
            style={{ borderColor: "var(--bd)" }}
          >
            {calculator.population}
          </span>
        )}
      </Link>

      {isLocked && (
        <span
          className="absolute top-3.5 right-3.5 z-10 flex size-6 items-center justify-center rounded-full bg-surface/85 text-secondary backdrop-blur-sm"
          title={t("membersOnly")}
        >
          <Lock className="size-3.5" aria-hidden="true" />
        </span>
      )}
      {isSignedIn && !isLocked && (
        <form action={toggleCalculatorFavoriteAction} className="absolute top-3.5 right-3.5 z-10">
          <input type="hidden" name="calculatorId" value={calculator.id} />
          <button
            type="submit"
            aria-pressed={isFavorited}
            aria-label={isFavorited ? t("removeFromFavourites") : t("addToFavourites")}
            className="flex size-6 items-center justify-center text-[17px] transition-colors duration-base"
            style={{ color: isFavorited ? "var(--cat-favourites-c)" : "#C6CED8" }}
          >
            <Star className="size-[17px]" fill={isFavorited ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  );
}
