"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Play, Search, FolderPlus, ListChecks, XCircle, Flag, EyeOff } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { QuestionCategory, QuestionBankRailStats } from "@/lib/question-bank";
import { MacFolderIcon } from "@/components/ui/MacFolderIcon";
import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_SWATCH } from "@/lib/card-colors";
import { NewCategoryDrawer } from "./NewCategoryDrawer";
import { startSessionAction } from "@/lib/actions/question-bank-session";
import type { SessionBuildFilter } from "@/lib/question-bank-session";
import { DEFAULT_SESSION_SIZE } from "@/lib/question-bank-session-constants";

// QBANK-IMPLEMENTATION.md Pass 1 (structure) + Pass 4 (wired to real
// sessions once the engine existed) — "Replace the library tree on
// /qbank with the question index" (SidebarFrame.tsx swaps this in for
// /question-bank the same way it already does FlashcardsSidebar for
// /flashcards and ClinicalToolsSidebar for /clinical-tools; the
// generic condition-browsing tree it showed before had nothing to do
// with practice questions). Folders link to the one destination that
// already worked before the session engine did:
// /question-bank/category/[id].
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
  isSignedIn: boolean;
  headerAction?: ReactNode;
}

export function QuestionBankSidebar({ stats, categories, isEditor, isSignedIn, headerAction }: QuestionBankSidebarProps) {
  const t = useTranslations("questionBank");
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const matchingCategories = useMemo(() => categories.filter((c) => !q || c.name.toLowerCase().includes(q)), [categories, q]);

  const isAllQuestionsActive = pathname === "/question-bank";

  // Every Practice/By-subject row starts a real session — nothing to
  // start when signed out (recordAttemptAction and startSessionAction
  // both require a session), so those rows stay plain, non-interactive
  // counts for a visitor, same as before Pass 4.
  function handlePractice(filter: SessionBuildFilter, subjectId?: string) {
    if (!isSignedIn) return;
    startTransition(async () => {
      const sessionId = await startSessionAction("tutor", { filter, subjectId, size: DEFAULT_SESSION_SIZE });
      if (sessionId) router.push(`/question-bank/session/${sessionId}`);
    });
  }

  return (
    <nav aria-label={t("pageTitle")} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
      <div className="flex items-center gap-1.5">
        {isSignedIn ? (
          <button
            type="button"
            onClick={() => handlePractice("smart")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 font-ui text-sm font-bold text-white hover:bg-accent-hover"
          >
            <Play className="size-3.5 fill-white" aria-hidden="true" />
            {t("startSession")}
          </button>
        ) : (
          <Link
            href="/login"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 font-ui text-sm font-bold text-white hover:bg-accent-hover"
          >
            <Play className="size-3.5 fill-white" aria-hidden="true" />
            {t("startSession")}
          </Link>
        )}
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
          <PracticeRow
            icon={ListChecks}
            iconClassName="text-secondary"
            label={t("allQuestions")}
            count={stats.totalQuestions}
            active={isAllQuestionsActive}
            disabled={!isSignedIn || stats.totalQuestions === 0}
            onClick={() => handlePractice("smart")}
          />
          <PracticeRow icon={XCircle} iconClassName="text-warning" label={t("myIncorrect")} count={stats.incorrect} disabled={!isSignedIn || stats.incorrect === 0} onClick={() => handlePractice("incorrect")} />
          <PracticeRow icon={Flag} iconClassName="text-insight" label={t("flaggedRailLabel")} count={stats.flagged} disabled={!isSignedIn || stats.flagged === 0} onClick={() => handlePractice("flagged")} />
          <PracticeRow icon={EyeOff} iconClassName="text-secondary" label={t("notSeenYet")} count={stats.notSeen} disabled={!isSignedIn || stats.notSeen === 0} onClick={() => handlePractice("notSeen")} />
        </div>
      </div>

      {stats.bySubject.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="px-2.5 font-ui text-xs font-medium text-secondary">{t("bySubjectHeading")}</span>
          <div className="flex flex-col gap-0.5">
            {stats.bySubject.map((subject) => (
              <button
                key={subject.subjectId}
                type="button"
                onClick={() => handlePractice("subject", subject.subjectId)}
                disabled={!isSignedIn}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className={`size-2.5 shrink-0 rounded-full ${CARD_COLOR_SWATCH[subject.subjectColor]}`} />
                <span className="min-w-0 flex-1 truncate text-left">{subject.subjectName}</span>
                {subject.accuracyPercent === null ? (
                  <span className="font-ui text-xs font-normal text-secondary">{t("notStarted")}</span>
                ) : (
                  <span className={`font-ui text-xs font-black ${accuracyBandClass(subject.accuracyPercent)}`}>{subject.accuracyPercent}%</span>
                )}
              </button>
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

function PracticeRow({
  icon: Icon,
  iconClassName,
  label,
  count,
  active,
  disabled,
  onClick,
}: {
  icon: typeof ListChecks;
  iconClassName: string;
  label: string;
  count: number;
  active?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary disabled:cursor-default disabled:hover:bg-transparent ${
        active ? "bg-border/30" : "hover:bg-border/30"
      }`}
    >
      <Icon className={`size-4 shrink-0 ${iconClassName}`} aria-hidden="true" />
      <span className="flex-1 text-left">{label}</span>
      <span className="font-ui text-xs font-normal text-secondary">{count}</span>
    </button>
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
