"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Star, FolderPlus, CalendarCheck, LayoutGrid, Lock } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import type { FlashcardCategory, TopicTile } from "@/lib/flashcards";
import { MacFolderIcon } from "@/components/ui/MacFolderIcon";
import type { CardColor } from "@/lib/editorial-blocks";
import { NewDeckDrawer } from "./NewDeckDrawer";
import { NewCategoryDrawer } from "./NewCategoryDrawer";

// The persistent left sidebar for the whole Flashcards feature
// (SidebarFrame.tsx swaps this in for every /flashcards route except
// the study screen, same way it swaps in ClinicalToolsSidebar for
// /clinical-tools) — the deck index the user asked to "function as a
// left sidebar" rather than content that only exists on the dashboard
// route and disappears the moment you open a topic or a deck. Was
// FlashcardsRail, embedded in FlashcardsDashboard.tsx's own page
// content; that version is gone; this one owns its own drawer state so
// "New Deck"/"New folder" work from anywhere in the feature, not just
// the dashboard.
//
// Search filters this sidebar's own topic/folder rows (self-contained,
// same shape as ClinicalToolsSidebar's own search) rather than a grid
// living in a *different* page's content — that only worked when this
// was mounted inside the dashboard page itself; a persistent sidebar
// has no reliable way to reach into whatever page happens to be open.
interface FlashcardsSidebarProps {
  dueToday: number;
  favoritedCount: number;
  topics: TopicTile[];
  libraryTopics: TopicTile[];
  systemCategories: FlashcardCategory[];
  folderDueBadges: Record<string, number>;
  isSignedIn: boolean;
  isEditor: boolean;
  headerAction?: ReactNode;
}

export function FlashcardsSidebar({
  dueToday,
  favoritedCount,
  topics,
  libraryTopics,
  systemCategories,
  folderDueBadges,
  isSignedIn,
  isEditor,
  headerAction,
}: FlashcardsSidebarProps) {
  const t = useTranslations("flashcards");
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [deckDrawerOpen, setDeckDrawerOpen] = useState(false);
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const matchingLibraryTopics = useMemo(() => libraryTopics.filter((topic) => !q || topic.name.toLowerCase().includes(q)), [libraryTopics, q]);
  const matchingTopics = useMemo(() => topics.filter((topic) => !q || topic.name.toLowerCase().includes(q)), [topics, q]);
  const matchingSystemCategories = useMemo(() => systemCategories.filter((cat) => !q || cat.name.toLowerCase().includes(q)), [systemCategories, q]);

  const isAllDecksActive = pathname === "/flashcards";

  return (
    <nav aria-label={t("pageTitle")} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
      <div className="flex items-center gap-1.5">
        {isSignedIn ? (
          <button
            type="button"
            onClick={() => setDeckDrawerOpen(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 font-ui text-sm font-bold text-white hover:bg-accent-hover"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("newDeck")}
          </button>
        ) : (
          <Link
            href="/login"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 font-ui text-sm font-bold text-primary hover:bg-border/40"
          >
            {t("signInLink")}
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

      <div className="flex flex-col gap-0.5">
        <Link
          href="/flashcards/study"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30"
        >
          <CalendarCheck className="size-4 shrink-0 text-secondary" aria-hidden="true" />
          {t("dueToday")}
          {dueToday > 0 && <span className="ml-auto rounded-full bg-[#E8564B] px-1.5 py-0.5 font-ui text-[10px] font-black text-white">{dueToday}</span>}
        </Link>
        <Link
          href="/flashcards"
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary ${isAllDecksActive ? "bg-border/30" : "hover:bg-border/30"}`}
        >
          <LayoutGrid className="size-4 shrink-0 text-secondary" aria-hidden="true" />
          {t("allDecks")}
        </Link>
        {isSignedIn && (
          <Link href="/flashcards/favourites" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30">
            <Star className="size-4 shrink-0 text-secondary" aria-hidden="true" />
            {t("favourites")}
            <span className="ml-auto font-ui text-xs font-normal text-secondary">{favoritedCount}</span>
          </Link>
        )}
      </div>

      {isSignedIn ? (
        <>
          {matchingLibraryTopics.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="px-2.5 font-ui text-xs font-medium text-secondary">{t("fromTheLibraryRailHeading")}</span>
              <div className="flex flex-col gap-0.5">
                {matchingLibraryTopics.map((topic) => (
                  <RailFolderRow key={topic.id} id={topic.id} name={topic.name} due={topic.dueCount} topicColor={topic.topicColor ?? undefined} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2.5">
              <span className="font-ui text-xs font-medium text-secondary">{t("myFolders")}</span>
              <button type="button" onClick={() => setFolderDrawerOpen(true)} aria-label={t("newFolder")} className="text-secondary hover:text-accent">
                <FolderPlus className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {matchingTopics.length === 0 ? (
                <p className="px-2.5 font-ui text-xs text-secondary">{t("noFoldersYet")}</p>
              ) : (
                matchingTopics.map((topic) => <RailFolderRow key={topic.id} id={topic.id} name={topic.name} due={topic.dueCount} topicColor={topic.topicColor ?? undefined} />)
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-2.5">
            <span className="font-ui text-xs font-medium text-secondary">{t("myFolders")}</span>
            {isEditor && (
              <button type="button" onClick={() => setFolderDrawerOpen(true)} aria-label={t("newFolder")} className="text-secondary hover:text-accent">
                <FolderPlus className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {matchingSystemCategories.length === 0 ? (
              <p className="px-2.5 font-ui text-xs text-secondary">{t("noFoldersYet")}</p>
            ) : (
              matchingSystemCategories.map((cat) => {
                const isLocked = !cat.isPublic;
                const due = folderDueBadges[cat.id] ?? 0;
                return (
                  <Link
                    key={cat.id}
                    href={`/flashcards/category/${cat.id}`}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30"
                  >
                    <MacFolderIcon color={(isLocked ? "slate" : cat.color) as CardColor} className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{cat.name}</span>
                    {isLocked ? (
                      <Lock className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
                    ) : (
                      due > 0 && <span className="rounded-full bg-[#E8564B] px-1.5 py-0.5 font-ui text-[10px] font-black text-white">{due}</span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}

      <NewDeckDrawer open={deckDrawerOpen} onClose={() => setDeckDrawerOpen(false)} />
      <NewCategoryDrawer open={folderDrawerOpen} onClose={() => setFolderDrawerOpen(false)} ownerType="user" />
    </nav>
  );
}

function RailFolderRow({ id, name, due, topicColor }: { id: string; name: string; due: number; topicColor?: string }) {
  const pathname = usePathname();
  const isActive = pathname === `/flashcards/category/${id}`;
  return (
    <Link
      href={`/flashcards/category/${id}`}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary ${isActive ? "bg-border/30" : "hover:bg-border/30"}`}
    >
      <span data-topic-color={topicColor} className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: topicColor ? "var(--topic)" : "var(--color-border)" }} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {due > 0 && <span className="rounded-full bg-[#E8564B] px-1.5 py-0.5 font-ui text-[10px] font-black text-white">{due}</span>}
    </Link>
  );
}
