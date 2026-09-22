"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Star, ChevronUp, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CalculatorSummary } from "@/lib/clinical-tools";
import { toggleCalculatorFavoriteAction } from "@/lib/actions/workspace";

// TOOLS-IMPLEMENTATION.md Pass 4 point 4 — "a table of code, name,
// category, items, time, star — sortable by name, time and items." A
// dense alternative to the card grid for a reader who already knows
// which tool they want, behind the Cards/List toggle
// (ClinicalToolsBrowser.tsx owns which one is showing and remembers
// the choice). Always flat/unsectioned — favourites-first grouping is
// a Cards-view idea; List's whole point is one sortable table.
type SortKey = "name" | "time" | "items";
type SortDirection = "asc" | "desc";

export function CalculatorListView({
  calculators,
  favoritedIds,
  isSignedIn,
}: {
  calculators: CalculatorSummary[];
  favoritedIds: Set<string>;
  isSignedIn: boolean;
}) {
  const t = useTranslations("clinicalTools");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return calculators;
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...calculators].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "items") return (a.itemCount - b.itemCount) * dir;
      // "time" sorts by the low end of the estimated range — a null
      // range (shouldn't happen in practice, but the type allows it)
      // sorts last regardless of direction rather than colliding with 0.
      const aTime = a.estimatedMinutesMin ?? Infinity;
      const bTime = b.estimatedMinutesMin ?? Infinity;
      return (aTime - bTime) * dir;
    });
  }, [calculators, sortKey, sortDirection]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] border-collapse font-ui text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-sunken text-left text-[10.5px] font-black tracking-[0.08em] text-secondary uppercase">
            <th className="w-10 px-3 py-2.5" aria-hidden="true" />
            <th className="px-3 py-2.5">{t("listColumnCode")}</th>
            <SortableHeader label={t("listColumnName")} active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name")} />
            <th className="px-3 py-2.5">{t("listColumnCategory")}</th>
            <SortableHeader label={t("listColumnItems")} active={sortKey === "items"} direction={sortDirection} onClick={() => toggleSort("items")} align="right" />
            <SortableHeader label={t("listColumnTime")} active={sortKey === "time"} direction={sortDirection} onClick={() => toggleSort("time")} align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((calculator) => {
            const isFavorited = favoritedIds.has(calculator.id);
            const timeLabel =
              calculator.estimatedMinutesMin != null && calculator.estimatedMinutesMax != null
                ? calculator.estimatedMinutesMin === calculator.estimatedMinutesMax
                  ? t("estimatedMinutes", { minutes: calculator.estimatedMinutesMin })
                  : t("estimatedMinutesRange", {
                      min: calculator.estimatedMinutesMin,
                      max: calculator.estimatedMinutesMax,
                    })
                : "—";
            return (
              <tr key={calculator.id} data-category={calculator.categorySlug} className="border-b border-border/70 last:border-b-0 hover:bg-surface-sunken/60">
                <td className="px-3 py-2">
                  {isSignedIn && (
                    <form action={toggleCalculatorFavoriteAction}>
                      <input type="hidden" name="calculatorId" value={calculator.id} />
                      <button
                        type="submit"
                        aria-pressed={isFavorited}
                        aria-label={isFavorited ? t("removeFromFavourites") : t("addToFavourites")}
                        className="flex size-5 items-center justify-center"
                        style={{ color: isFavorited ? "var(--cat-favourites-c)" : "#C6CED8" }}
                      >
                        <Star className="size-4" fill={isFavorited ? "currentColor" : "none"} aria-hidden="true" />
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-3 py-2">
                  {calculator.abbreviation && (
                    <span
                      className="inline-block rounded-[6px] px-2 py-0.5 font-ui text-[10.5px] font-black tracking-[0.3px]"
                      style={{ background: "var(--tint)", color: "var(--c)" }}
                    >
                      {calculator.abbreviation}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/clinical-tools/${calculator.slug}`} className="font-bold text-navy hover:underline">
                    {calculator.name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-secondary">
                    <span className="size-2 shrink-0 rounded-[2px]" style={{ background: "var(--c)" }} aria-hidden="true" />
                    {calculator.categoryName}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-secondary">
                  {calculator.itemCount > 0 ? calculator.itemCount : t("fullExam")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-secondary">{timeLabel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
  align,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  align?: "right";
}) {
  return (
    <th className={`px-3 py-2.5 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-primary" : "text-secondary"}`}
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <ChevronUp className="size-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-3" aria-hidden="true" />
          )
        ) : (
          <span className="size-3" aria-hidden="true" />
        )}
      </button>
    </th>
  );
}
