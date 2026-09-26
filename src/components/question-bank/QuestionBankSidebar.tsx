"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Play, Search, FolderPlus, ListChecks, XCircle, Flag, EyeOff } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import type { QuestionCategory, QuestionBankRailStats } from "@/lib/question-bank";
import { MacFolderIcon } from "@/components/ui/MacFolderIcon";
import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_SWATCH } from "@/lib/card-colors";
import { NewCategoryDrawer } from "./NewCategoryDrawer";

// QBANK-IMPLEMENTATION.md Pass 1 — "Replace the library tree on
// /qbank with the question index" (SidebarFrame.tsx swaps this in for
// /question-bank the same way it already does FlashcardsSidebar for
// /flashcards and ClinicalToolsSidebar for /clinical-tools; the
// generic condition-browsing tree it showed before had nothing to do
// with practice questions).
//
// Practice and By subject are counts only for this pass, not yet
// links — there's no cross-folder practice session or per-subject
// browse page to send them to (that's Pass 4's session engine and
// Pass 2's dashboard respectively); wiring real destinations here
// once those exist is straightforward since the data (stats) is
// already correct. Folders link to the one destination that already
// works today: the existing /question-bank/category/[id] page.
//
// Accuracy bands reuse the app's existing meaningful-color tokens
// rather than inventing new ones — trust/insight/warning are already
// green/amber/red (globals.css), matching QBANK-SPEC.md's own
// "≥70% green, 55-69% amber, <55% red" verbatim.
function accuracyBandClass(percent: number): string {
  if (percent >= 70) return "text-trust";
  if (percent >= 55) return "text-insight";
  return "text-warning";
}

interface QuestionBankSidebarProps {
  stats: QuestionBankRailStats;
  categories: QuestionCategory[];
  isEditor: boolean;
  headerAction?: ReactNode;
}

export function QuestionBankSidebar({ stats, categories, isEditor, headerAction }: QuestionBankSidebarProps) {
  const t = useTranslations("questionBank");
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const matchingCategories = useMemo(() => categories.filter((c) => !q || c.name.toLowerCase().includes(q)), [categories, q]);

  const isAllQuestionsActive = pathname === "/question-bank";

  return (
    <nav aria-label={t("pageTitle")} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
      <div className="flex items-center gap-1.5">
        <Link
          href="/question-bank"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 font-ui text-sm font-bold text-white hover:bg-accent-hover"
        >
          <Play className="size-3.5 fill-white" aria-hidden="true" />
          {t("startSession")}
        </Link>
        {headerAction}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-secondary" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-full border border-border bg-surface-raised py-2.5 pr-4 pl-10 font-ui text-sm text-primary outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="px-2.5 font-ui text-xs font-medium text-secondary">{t("practiceHeading")}</span>
        <div className="flex flex-col gap-0.5">
          <div className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary ${isAllQuestionsActive ? "bg-border/30" : ""}`}>
            <ListChecks className="size-4 shrink-0 text-secondary" aria-hidden="true" />
            {t("allQuestions")}
            <span className="ml-auto font-ui text-xs font-normal text-secondary">{stats.totalQuestions}</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary">
            <XCircle className="size-4 shrink-0 text-warning" aria-hidden="true" />
            {t("myIncorrect")}
            <span className="ml-auto font-ui text-xs font-normal text-secondary">{stats.incorrect}</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary">
            <Flag className="size-4 shrink-0 text-insight" aria-hidden="true" />
            {t("flaggedRailLabel")}
            <span className="ml-auto font-ui text-xs font-normal text-secondary">{stats.flagged}</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary">
            <EyeOff className="size-4 shrink-0 text-secondary" aria-hidden="true" />
            {t("notSeenYet")}
            <span className="ml-auto font-ui text-xs font-normal text-secondary">{stats.notSeen}</span>
          </div>
        </div>
      </div>

      {stats.bySubject.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="px-2.5 font-ui text-xs font-medium text-secondary">{t("bySubjectHeading")}</span>
          <div className="flex flex-col gap-0.5">
            {stats.bySubject.map((subject) => (
              <div key={subject.subjectId} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary">
                <span className={`size-2.5 shrink-0 rounded-full ${CARD_COLOR_SWATCH[subject.subjectColor]}`} />
                <span className="min-w-0 flex-1 truncate">{subject.subjectName}</span>
                {subject.accuracyPercent === null ? (
                  <span className="font-ui text-xs font-normal text-secondary">{t("notStarted")}</span>
                ) : (
                  <span className={`font-ui text-xs font-black ${accuracyBandClass(subject.accuracyPercent)}`}>{subject.accuracyPercent}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-2.5">
          <span className="font-ui text-xs font-medium text-secondary">{t("folders")}</span>
          {isEditor && (
            <button type="button" onClick={() => setFolderDrawerOpen(true)} aria-label={t("newFolder")} className="text-secondary hover:text-accent">
              <FolderPlus className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {matchingCategories.length === 0 ? (
            <p className="px-2.5 font-ui text-xs text-secondary">{t("noFoldersYet")}</p>
          ) : (
            matchingCategories.map((category) => <FolderRow key={category.id} id={category.id} name={category.name} color={category.color} count={category.setCount} />)
          )}
        </div>
      </div>

      {isEditor && <NewCategoryDrawer open={folderDrawerOpen} onClose={() => setFolderDrawerOpen(false)} />}

      <p className="mt-auto border-t border-border px-2.5 pt-3 font-ui text-xs text-secondary">
        {t("railFooter", { answered: stats.answered, percent: stats.accuracyPercent ?? 0, folders: categories.length })}
      </p>
    </nav>
  );
}

function FolderRow({ id, name, color, count }: { id: string; name: string; color: CardColor; count: number }) {
  const pathname = usePathname();
  const isActive = pathname === `/question-bank/category/${id}`;
  return (
    <Link
      href={`/question-bank/category/${id}`}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary ${isActive ? "bg-border/30" : "hover:bg-border/30"}`}
    >
      <MacFolderIcon color={color} className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="font-ui text-xs font-normal text-secondary">{count}</span>
    </Link>
  );
}
