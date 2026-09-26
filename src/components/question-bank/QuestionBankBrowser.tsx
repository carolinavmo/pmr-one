"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import type { QuestionCategory, QuestionSetSummary } from "@/lib/question-bank";
import { QuestionSetCard, QuestionSetListRow } from "./QuestionSetCard";
import { NewQuestionSetDrawer } from "./NewQuestionSetDrawer";

type ViewMode = "grid" | "list";

// The dashboard's "unfiled" bucket — decks with no folder. Folder
// browsing itself moved to QuestionBankFolderGrid.tsx
// (QBANK-IMPLEMENTATION.md Pass 2's pastel cards, subject-grouped);
// this component now only owns the sets that aren't in any folder,
// same role FlashcardsDashboard.tsx's own "#your-decks" section plays.
// "New Folder" moved to QuestionBankSidebar.tsx (Pass 1) — one trigger,
// not two.
export function QuestionBankBrowser({
  categories,
  unfiledSets,
  isEditor,
}: {
  categories: QuestionCategory[];
  unfiledSets: QuestionSetSummary[];
  isEditor: boolean;
}) {
  const t = useTranslations("questionBank");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [setDrawerOpen, setSetDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unfiledSets;
    return unfiledSets.filter(
      (set) => set.name.toLowerCase().includes(q) || set.description.toLowerCase().includes(q)
    );
  }, [unfiledSets, query]);

  if (unfiledSets.length === 0 && !isEditor) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-lg font-black text-navy">{t("unfiledSets")}</h2>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-secondary" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-full border border-border bg-surface-raised py-2.5 pr-4 pl-10 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center rounded-full border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label={t("viewGrid")}
              aria-pressed={view === "grid"}
              className={`flex size-8 items-center justify-center rounded-full transition-colors duration-base ${
                view === "grid" ? "bg-accent text-white" : "text-secondary hover:text-primary"
              }`}
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label={t("viewList")}
              aria-pressed={view === "list"}
              className={`flex size-8 items-center justify-center rounded-full transition-colors duration-base ${
                view === "list" ? "bg-accent text-white" : "text-secondary hover:text-primary"
              }`}
            >
              <List className="size-4" aria-hidden="true" />
            </button>
          </div>
          {isEditor && (
            <button
              type="button"
              onClick={() => setSetDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-2 font-ui text-sm font-medium text-white hover:bg-accent-hover"
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("newSet")}
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">
          {query.trim() ? t("noSetsMatch") : t("noUnfiledSets")}
        </p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((set) => (
            <QuestionSetCard key={set.id} set={set} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface-raised">
          {filtered.map((set) => (
            <QuestionSetListRow key={set.id} set={set} />
          ))}
        </div>
      )}

      <NewQuestionSetDrawer open={setDrawerOpen} onClose={() => setSetDrawerOpen(false)} categories={categories} defaultCategoryId={null} />
    </div>
  );
}
