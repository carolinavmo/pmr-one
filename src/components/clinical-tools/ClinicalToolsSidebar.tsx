"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Search, ChevronRight, ChevronDown } from "lucide-react";
import type { CalculatorCategory, CalculatorSummary } from "@/lib/clinical-tools";

// TOOLS-DASHBOARD-SPEC.md's expandable sidebar — the tool index for
// `/clinical-tools*`, replacing the topic tree there (SidebarFrame.tsx
// picks between this and IndexSidebar by route). No "BY POPULATION"
// section: the data audit found no population-tag table exists (only
// a single free-text `population` line per calculator, already used
// on the card) — TOOLS-IMPLEMENTATION.md's own data audit says to
// drop that section rather than fake it.

// Pure per-browser UI chrome (which category is open, whether
// Favourites is collapsed) — same useSyncExternalStore-over-
// localStorage shape as SidebarFrame's sidebar-collapsed and
// IndexSidebar's dock-mode, not a DB-backed per-account preference
// like library_home_prefs (that one persists real cross-device
// account state; this is just "where I left the accordion").
function createLocalStore(key: string, defaultValue: string | null) {
  let listeners: (() => void)[] = [];
  return {
    subscribe(onChange: () => void) {
      listeners.push(onChange);
      return () => {
        listeners = listeners.filter((l) => l !== onChange);
      };
    },
    getSnapshot() {
      return localStorage.getItem(key) ?? defaultValue;
    },
    getServerSnapshot() {
      return defaultValue;
    },
    set(value: string | null) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      for (const l of listeners) l();
    },
  };
}
const openCategoryStore = createLocalStore("pmr-atlas:clinical-tools-open-category", null);
const favouritesCollapsedStore = createLocalStore("pmr-atlas:clinical-tools-favourites-collapsed", "false");

interface ClinicalToolsSidebarProps {
  categories: CalculatorCategory[];
  calculators: CalculatorSummary[];
  favoritedIds: Set<string>;
  // Placed inline in the search row, same slot IndexSidebar's own
  // collapse toggle occupies (SidebarFrame.tsx passes the same button
  // to whichever sidebar actually mounts).
  headerAction?: ReactNode;
}

export function ClinicalToolsSidebar({ categories, calculators, favoritedIds, headerAction }: ClinicalToolsSidebarProps) {
  const t = useTranslations("clinicalTools");
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const storedOpenCategory = useSyncExternalStore(
    openCategoryStore.subscribe,
    openCategoryStore.getSnapshot,
    openCategoryStore.getServerSnapshot
  );
  const favouritesCollapsed =
    useSyncExternalStore(
      favouritesCollapsedStore.subscribe,
      favouritesCollapsedStore.getSnapshot,
      favouritesCollapsedStore.getServerSnapshot
    ) === "true";

  // "Opening a calculator keeps the sidebar — its category opens and
  // the tool is marked" (spec) — while on a tool's own page, the open
  // category is derived from that tool, not the remembered value, and
  // it overwrites the remembered value so the index still shows it
  // open on the way back.
  const currentSlug = pathname.startsWith("/clinical-tools/") ? pathname.split("/")[2] : undefined;
  const currentCalculator = currentSlug ? calculators.find((c) => c.slug === currentSlug) : undefined;

  useEffect(() => {
    if (currentCalculator) openCategoryStore.set(currentCalculator.categorySlug);
  }, [currentCalculator]);

  const q = query.trim().toLowerCase();
  const matches = (c: CalculatorSummary) =>
    !q || c.name.toLowerCase().includes(q) || (c.abbreviation?.toLowerCase().includes(q) ?? false);

  const favoritedCalculators = useMemo(
    () => calculators.filter((c) => favoritedIds.has(c.id) && matches(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calculators, favoritedIds, q]
  );

  const openCategorySlug = currentCalculator?.categorySlug ?? storedOpenCategory;

  return (
    <nav aria-label={t("pageTitle")} className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
      <div className="mb-1.5 flex shrink-0 items-center gap-1.5 px-1">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-secondary"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("findACalculator")}
            className="w-full rounded-[9px] border border-border bg-surface-sunken py-1.5 pr-2 pl-8 font-ui text-xs text-primary placeholder:text-[#A6B0BC] outline-none transition-colors duration-base focus:border-accent focus:bg-surface"
          />
        </div>
        {headerAction}
      </div>

      {favoritedIds.size > 0 && favoritedCalculators.length > 0 && (
        <div data-category="favourites">
          <CategoryHeader
            label={`★ ${t("favouritesHeading")}`}
            count={favoritedCalculators.length}
            isOpen={q ? true : !favouritesCollapsed}
            alwaysTinted
            onToggle={() => favouritesCollapsedStore.set(favouritesCollapsed ? "false" : "true")}
          />
          {(q ? true : !favouritesCollapsed) && (
            <ToolList calculators={favoritedCalculators} currentSlug={currentSlug} />
          )}
        </div>
      )}

      <div className="mt-1 px-2 py-1 font-ui text-[9.5px] font-black tracking-[1.4px] text-[#9AA5B4]">
        {t("categoriesGroup")}
      </div>

      {categories.map((category) => {
        const categoryCalculators = calculators.filter((c) => c.categorySlug === category.slug);
        if (categoryCalculators.length === 0) return null;
        const filtered = categoryCalculators.filter(matches);
        if (q && filtered.length === 0) return null;
        const isOpen = q ? true : openCategorySlug === category.slug;
        return (
          <div key={category.id} data-category={category.slug}>
            <CategoryHeader
              label={category.name}
              count={categoryCalculators.length}
              isOpen={isOpen}
              onToggle={() => openCategoryStore.set(openCategorySlug === category.slug ? null : category.slug)}
            />
            {isOpen && (
              <ToolList calculators={q ? filtered : categoryCalculators} currentSlug={currentSlug} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function CategoryHeader({
  label,
  count,
  isOpen,
  alwaysTinted,
  onToggle,
}: {
  label: string;
  count: number;
  isOpen: boolean;
  alwaysTinted?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 font-ui text-[12.5px] font-extrabold"
      style={
        isOpen || alwaysTinted
          ? { background: "var(--tint)", color: "var(--c)" }
          : { color: "var(--color-text-primary)" }
      }
    >
      <span className="size-[9px] shrink-0 rounded-[3px]" style={{ background: "var(--c)" }} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <span className="font-ui text-[10.5px] font-extrabold text-[#9AA5B4]">{count}</span>
      {isOpen ? (
        <ChevronDown className="size-3.5 shrink-0 text-[#AAB4C1]" aria-hidden="true" />
      ) : (
        <ChevronRight className="size-3.5 shrink-0 text-[#AAB4C1]" aria-hidden="true" />
      )}
    </button>
  );
}

function ToolList({
  calculators,
  currentSlug,
}: {
  calculators: CalculatorSummary[];
  currentSlug: string | undefined;
}) {
  return (
    <ul className="ml-3 flex flex-col gap-px border-l border-border/60 pl-2">
      {calculators.map((calculator) => {
        const isCurrent = calculator.slug === currentSlug;
        return (
          <li key={calculator.id}>
            {/* Every row carries its OWN calculator's category — a
                favourited tool keeps its real category color even
                inside the gold band (spec: cards do this too, see
                CalculatorCard.tsx), it never inherits the ancestor's
                data-category (independent of which list it's in). */}
            <Link
              href={`/clinical-tools/${calculator.slug}`}
              aria-current={isCurrent ? "page" : undefined}
              data-category={calculator.categorySlug}
              className={`flex items-center gap-2 rounded-[7px] px-2 py-1.5 font-ui text-[11.5px] leading-[1.3] transition-colors duration-base hover:bg-surface ${
                isCurrent ? "bg-surface font-extrabold text-navy shadow-[0_1px_3px_rgba(20,40,74,0.08)]" : "font-semibold text-secondary"
              }`}
            >
              {calculator.abbreviation && (
                <span
                  className="shrink-0 rounded-[4px] px-1.5 py-0.5 font-ui text-[9px] font-black tracking-[0.3px]"
                  style={
                    isCurrent
                      ? { background: "var(--c)", color: "#fff" }
                      : { background: "var(--tint)", color: "var(--c)" }
                  }
                >
                  {calculator.abbreviation}
                </span>
              )}
              <span className="min-w-0 flex-1">{calculator.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
