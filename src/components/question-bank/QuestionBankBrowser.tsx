"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, List, Plus, Search, ChevronRight, FolderPlus, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { QuestionCategory, QuestionSetSummary } from "@/lib/question-bank";
import { CARD_COLOR_SWATCH } from "@/lib/card-colors";
import { MacFolderIcon } from "@/components/ui/MacFolderIcon";
import type { CardColor } from "@/lib/editorial-blocks";
import { QuestionSetCard, QuestionSetListRow } from "./QuestionSetCard";
import { NewQuestionSetDrawer } from "./NewQuestionSetDrawer";
import { NewCategoryDrawer } from "./NewCategoryDrawer";

type ViewMode = "grid" | "list";

// Dashboard browser — deliberately its own component rather than
// sharing FlashcardsBrowser.tsx, even though the folder-tile pattern
// is nearly identical (see this feature's plan file). No user-owned
// folders or favorites here, so it's structurally simpler: one
// category list, one unfiled-sets list, one "New Folder"/"New Set"
// pair gated by isEditor.
export function QuestionBankBrowser({
  categories,
  unfiledSets,
  isEditor,
  isSignedIn,
}: {
  categories: QuestionCategory[];
  unfiledSets: QuestionSetSummary[];
  isEditor: boolean;
  isSignedIn: boolean;
}) {
  const t = useTranslations("questionBank");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [setDrawerOpen, setSetDrawerOpen] = useState(false);
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unfiledSets;
    return unfiledSets.filter(
      (set) => set.name.toLowerCase().includes(q) || set.description.toLowerCase().includes(q)
    );
  }, [unfiledSets, query]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
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

        <div className="flex items-center gap-2">
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

      {(categories.length > 0 || isEditor) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs font-medium text-secondary">{t("folders")}</span>
            {isEditor && (
              <button
                type="button"
                onClick={() => setFolderDrawerOpen(true)}
                className="flex items-center gap-1.5 font-ui text-xs font-medium text-accent hover:text-accent-hover"
              >
                <FolderPlus className="size-3.5" aria-hidden="true" />
                {t("newFolder")}
              </button>
            )}
          </div>
          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  id={cat.id}
                  label={cat.name}
                  color={cat.color}
                  count={cat.setCount}
                  isPublic={cat.isPublic}
                  isSignedIn={isSignedIn}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface-raised">
              {categories.map((cat) => (
                <CategoryListRow
                  key={cat.id}
                  id={cat.id}
                  label={cat.name}
                  color={cat.color}
                  count={cat.setCount}
                  isPublic={cat.isPublic}
                  isSignedIn={isSignedIn}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">
          {query.trim() ? t("noSetsMatch") : t("allSetsInFolders")}
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

      <NewQuestionSetDrawer
        open={setDrawerOpen}
        onClose={() => setSetDrawerOpen(false)}
        categories={categories}
        defaultCategoryId={null}
      />
      <NewCategoryDrawer open={folderDrawerOpen} onClose={() => setFolderDrawerOpen(false)} />
    </div>
  );
}

// Same tile shape as Flashcards' current CategoryCard — a colored card
// with a small tab peeking out above it, name + count at the bottom.
// Duplicated rather than shared (see this file's own header comment).
function CategoryCard({
  id,
  label,
  color,
  count,
  isPublic,
  isSignedIn,
}: {
  id: string;
  label: string;
  color: CardColor;
  count: number;
  isPublic: boolean;
  isSignedIn: boolean;
}) {
  const t = useTranslations("questionBank");
  const isLocked = !isPublic && !isSignedIn;

  return (
    <div className="relative">
      <Link
        href={`/question-bank/category/${id}`}
        className={`group relative flex flex-col pt-2 text-left transition-transform duration-base hover:-translate-y-0.5 ${
          isLocked ? "opacity-60" : ""
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0 left-4 h-4 w-14 rounded-t-lg ${CARD_COLOR_SWATCH[color]} opacity-90`}
        />
        <span
          className={`relative flex h-28 flex-col justify-end rounded-2xl p-3.5 shadow-sm transition-shadow duration-base group-hover:shadow-md sm:h-32 ${CARD_COLOR_SWATCH[color]}`}
        >
          <span className="flex flex-col gap-0.5">
            <span className="line-clamp-1 font-ui text-lg font-semibold text-white">{label}</span>
            <span className="font-ui text-xs text-white/75">{t("setCount", { count })}</span>
          </span>
        </span>
      </Link>
      {isLocked && (
        <span
          className="absolute top-5 left-3 z-10 flex size-7 items-center justify-center rounded-full bg-surface/80 text-secondary backdrop-blur-sm"
          title={t("membersOnly")}
        >
          <Lock className="size-3.5" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

function CategoryListRow({
  id,
  label,
  color,
  count,
  isPublic,
  isSignedIn,
}: {
  id: string;
  label: string;
  color: CardColor;
  count: number;
  isPublic: boolean;
  isSignedIn: boolean;
}) {
  const t = useTranslations("questionBank");
  const isLocked = !isPublic && !isSignedIn;

  return (
    <Link
      href={`/question-bank/category/${id}`}
      className={`flex items-center gap-3 p-3.5 transition-colors duration-base hover:opacity-80 ${
        isLocked ? "opacity-60" : ""
      }`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center">
        <MacFolderIcon color={color} className="size-8 drop-shadow-sm" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-ui text-sm font-semibold text-primary">{label}</span>
        <span className="font-ui text-xs text-secondary">{t("setCount", { count })}</span>
      </div>
      {isLocked && (
        <span title={t("membersOnly")}>
          <Lock className="size-4 shrink-0 text-secondary" aria-hidden="true" />
        </span>
      )}
      <ChevronRight className="size-4 shrink-0 text-secondary" aria-hidden="true" />
    </Link>
  );
}
