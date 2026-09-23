"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import type { CalculatorCategory, CalculatorSummary } from "@/lib/clinical-tools";
import { CalculatorCard } from "@/components/clinical-tools/CalculatorCard";
import { CalculatorListView } from "@/components/clinical-tools/CalculatorListView";

// Cards vs. List — per-browser UI chrome, same localStorage-backed
// useSyncExternalStore shape as the sidebar's own toggles
// (ClinicalToolsSidebar.tsx), "remembers the choice" (Pass 4) without
// a DB round-trip.
const VIEW_STORAGE_KEY = "pmr-atlas:clinical-tools-view";
let viewListeners: (() => void)[] = [];
function subscribeView(onChange: () => void) {
  viewListeners.push(onChange);
  return () => {
    viewListeners = viewListeners.filter((l) => l !== onChange);
  };
}
function getViewSnapshot(): "cards" | "list" {
  return localStorage.getItem(VIEW_STORAGE_KEY) === "list" ? "list" : "cards";
}
function getViewServerSnapshot(): "cards" | "list" {
  return "cards";
}
function setView(value: "cards" | "list") {
  localStorage.setItem(VIEW_STORAGE_KEY, value);
  for (const l of viewListeners) l();
}

// Server-fetched data handed down as props (same "page.tsx fetches,
// one client component owns the interactive part" split
// StudyPlannerBoard already uses) — the calculator list is small
// enough that filtering happens entirely client-side against the
// already-fetched array, no separate search API route.
export function ClinicalToolsBrowser({
  categories,
  calculators,
  favoritedIds,
  usageCounts,
  isSignedIn,
}: {
  categories: CalculatorCategory[];
  calculators: CalculatorSummary[];
  favoritedIds: Set<string>;
  usageCounts: Map<string, number>;
  isSignedIn: boolean;
}) {
  const t = useTranslations("clinicalTools");
  const [query, setQuery] = useState("");
  const view = useSyncExternalStore(subscribeView, getViewSnapshot, getViewServerSnapshot);

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
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
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
        <div className="flex shrink-0 rounded-[11px] border border-border bg-surface-raised p-[3px]">
          <button
            type="button"
            onClick={() => setView("cards")}
            aria-pressed={view === "cards"}
            className={`rounded-[8px] px-3.5 py-2 font-ui text-[12.5px] font-extrabold transition-colors duration-base ${
              view === "cards" ? "bg-surface text-navy shadow-[0_1px_3px_rgba(20,40,74,0.1)]" : "text-secondary"
            }`}
          >
            {t("cardsView")}
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={`rounded-[8px] px-3.5 py-2 font-ui text-[12.5px] font-extrabold transition-colors duration-base ${
              view === "list" ? "bg-surface text-navy shadow-[0_1px_3px_rgba(20,40,74,0.1)]" : "text-secondary"
            }`}
          >
            {t("listView")}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="font-ui text-sm text-secondary">{t("noResults")}</p>
      ) : view === "list" ? (
        <CalculatorListView calculators={filtered} favoritedIds={favoritedIds} isSignedIn={isSignedIn} />
      ) : (
        <>
          {isSignedIn && favorited.length > 0 && (
            // Gold band wraps the section band + card grid together, but
            // never the cards themselves — each card keeps re-declaring
            // its own category's data-category inside, so it renders in
            // its real category color even inside the gold wrap (spec:
            // "the same tools keep a filled star... duplicate, but
            // visibly linked", not recolored).
            <div data-category="favourites" className="rounded-2xl border p-3.5" style={{ background: "var(--tint)", borderColor: "var(--bd)" }}>
              <SectionBand title={`★ ${t("favouritesHeading")}`} count={favorited.length} />
              <CardGrid>
                {favorited.map((calculator) => (
                  <CalculatorCard
                    key={calculator.id}
                    calculator={calculator}
                    isFavorited
                    isSignedIn={isSignedIn}
                    usageCount={usageCounts.get(calculator.id) ?? 0}
                  />
                ))}
              </CardGrid>
            </div>
          )}

          {categories.map((category) => {
            const categoryCalculators = filtered.filter((c) => c.categorySlug === category.slug);
            if (categoryCalculators.length === 0) return null;
            return (
              <div key={category.id} data-category={category.slug} className="flex flex-col">
                <SectionBand title={category.name} count={categoryCalculators.length} />
                <CardGrid>
                  {categoryCalculators.map((calculator) => (
                    <CalculatorCard
                      key={calculator.id}
                      calculator={calculator}
                      isFavorited={favoritedIds.has(calculator.id)}
                      isSignedIn={isSignedIn}
                      usageCount={usageCounts.get(calculator.id) ?? 0}
                    />
                  ))}
                </CardGrid>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// Solid --c background, white text — a founder follow-up on the
// spec's original Level 2 tinted band ("--tint background, title in
// --c"): a dark, category-colored strip stands out more against the
// tinted cards below it than a same-family tint-on-tint band did.
// Closer to the spec's own Level 3 "Headed" option (a solid --c strip)
// than Level 2, just without switching the cards themselves to that
// level too. Reads the same data-category-scoped tokens as the cards
// below it, set by the section's own wrapper div, never a per-category
// class branch here.
function SectionBand({ title, count }: { title: string; count: number }) {
  const t = useTranslations("clinicalTools");
  return (
    <div
      className="mb-3 flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5"
      style={{ background: "var(--c)" }}
    >
      <span className="font-ui text-[13.5px] font-black tracking-[0.2px] text-white">{title}</span>
      <span className="font-ui text-xs font-semibold text-white/70">
        {t("calculatorCount", { count })}
      </span>
      {/* "See all ›" — inert until a per-category filtered view exists
          to link to; kept as a styled span, not a dead <a>. The List
          view (Pass 4) covers "I want the full sortable set" instead. */}
      <span className="ml-auto font-ui text-xs font-extrabold text-white">{t("seeAll")}</span>
    </div>
  );
}

// TOOLS-IMPLEMENTATION.md Pass 4 point 5 — 3 cards/row from 1200px, 2
// from 820px, 1 below that. Equal heights within a row come free from
// grid's default stretch as long as each CalculatorCard is itself a
// flex column filling its cell, which it is.
function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3.5 min-[820px]:grid-cols-2 min-[1200px]:grid-cols-3">{children}</div>;
}
