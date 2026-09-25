"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Star, FolderPlus, CalendarCheck, LayoutGrid, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { FlashcardCategory, TopicTile } from "@/lib/flashcards";
import { MacFolderIcon } from "@/components/ui/MacFolderIcon";
import type { CardColor } from "@/lib/editorial-blocks";

// The 252px rail (FLASHCARDS-SPEC.md Pass 4 rule 4: "the rail is the
// deck index, not the library tree") — replaces SidebarFrame's normal
// library-tree sidebar on this exact route (SidebarFrame.tsx hides
// itself here the same way it already does for My Handbook's own
// index rail: "no sidebar slot at all — its own rail lives inside the
// page content itself"). Sticky, same top-offset-off-the-navbar
// mechanism as SidebarFrame.tsx itself, so this reads as a real
// sidebar (stays put while the main column scrolls) rather than a
// block of content that scrolls away with the page.
//
// FROM THE LIBRARY (system topics, directly studyable — no add/copy
// step) is listed above TOPICS (the visitor's own), matching the main
// column's own library-first ordering. A signed-out visitor sees only
// the system list, since there's no personal "my topics" without an
// account.
export function FlashcardsRail({
  query,
  onQueryChange,
  onNewDeckClick,
  onNewFolderClick,
  dueToday,
  favoritedCount,
  topics,
  libraryTopics,
  systemCategories,
  folderDueBadges,
  isSignedIn,
  isEditor,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onNewDeckClick: () => void;
  onNewFolderClick: () => void;
  dueToday: number;
  favoritedCount: number;
  topics: TopicTile[];
  libraryTopics: TopicTile[];
  systemCategories: FlashcardCategory[];
  folderDueBadges: Record<string, number>;
  isSignedIn: boolean;
  isEditor: boolean;
}) {
  const t = useTranslations("flashcards");

  // Same ResizeObserver-on-the-header technique as SidebarFrame.tsx —
  // the navbar's rendered height varies by locale and viewport (its
  // own row can wrap), so a fixed offset would drift.
  const [topOffset, setTopOffset] = useState(0);
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const updateOffset = () => setTopOffset(header.getBoundingClientRect().height);
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <aside
      // The offset is a CSS custom property, not a plain inline style,
      // so `top`/`height` only take effect at the `lg:` breakpoint
      // (Tailwind's responsive variants can gate a var() reference but
      // not a raw inline style) — below `lg` the rail stacks in normal
      // flow, full height, not sticky, same as SidebarFrame.tsx hiding
      // itself outright there instead of constraining its height.
      style={{ "--rail-top": `${topOffset}px` } as CSSProperties}
      className="flex w-full shrink-0 flex-col gap-5 lg:sticky lg:top-[var(--rail-top)] lg:h-[calc(100vh-var(--rail-top))] lg:w-[252px] lg:overflow-y-auto"
    >
      {isSignedIn ? (
        <button
          type="button"
          onClick={onNewDeckClick}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 font-ui text-sm font-bold text-white hover:bg-accent-hover"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("newDeck")}
        </button>
      ) : (
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 font-ui text-sm font-bold text-primary hover:bg-border/40"
        >
          {t("signInLink")}
        </Link>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-secondary" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-full border border-border bg-surface-raised py-2.5 pr-4 pl-10 font-ui text-sm text-primary outline-none focus:border-accent"
        />
      </div>

      <nav className="flex flex-col gap-0.5">
        <Link href="/flashcards/study" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30">
          <CalendarCheck className="size-4 shrink-0 text-secondary" aria-hidden="true" />
          {t("dueToday")}
          {dueToday > 0 && <span className="ml-auto rounded-full bg-[#E8564B] px-1.5 py-0.5 font-ui text-[10px] font-black text-white">{dueToday}</span>}
        </Link>
        <span className="flex items-center gap-2.5 rounded-lg bg-border/30 px-2.5 py-2 font-ui text-sm font-bold text-primary">
          <LayoutGrid className="size-4 shrink-0 text-secondary" aria-hidden="true" />
          {t("allDecks")}
        </span>
        {isSignedIn && (
          <Link href="/flashcards/favourites" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30">
            <Star className="size-4 shrink-0 text-secondary" aria-hidden="true" />
            {t("favourites")}
            <span className="ml-auto font-ui text-xs font-normal text-secondary">{favoritedCount}</span>
          </Link>
        )}
      </nav>

      {isSignedIn ? (
        <>
          {libraryTopics.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="px-2.5 font-ui text-xs font-medium text-secondary">{t("fromTheLibraryRailHeading")}</span>
              <div className="flex flex-col gap-0.5">
                {libraryTopics.map((topic) => (
                  <RailFolderRow key={topic.id} id={topic.id} name={topic.name} due={topic.dueCount} topicColor={topic.topicColor ?? undefined} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2.5">
              <span className="font-ui text-xs font-medium text-secondary">{t("myFolders")}</span>
              <button type="button" onClick={onNewFolderClick} aria-label={t("newFolder")} className="text-secondary hover:text-accent">
                <FolderPlus className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {topics.length === 0 ? (
                <p className="px-2.5 font-ui text-xs text-secondary">{t("noFoldersYet")}</p>
              ) : (
                topics.map((topic) => <RailFolderRow key={topic.id} id={topic.id} name={topic.name} due={topic.dueCount} topicColor={topic.topicColor ?? undefined} />)
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-2.5">
            <span className="font-ui text-xs font-medium text-secondary">{t("myFolders")}</span>
            {isEditor && (
              <button type="button" onClick={onNewFolderClick} aria-label={t("newFolder")} className="text-secondary hover:text-accent">
                <FolderPlus className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {systemCategories.length === 0 ? (
              <p className="px-2.5 font-ui text-xs text-secondary">{t("noFoldersYet")}</p>
            ) : (
              systemCategories.map((cat) => {
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
    </aside>
  );
}

function RailFolderRow({ id, name, due, topicColor }: { id: string; name: string; due: number; topicColor?: string }) {
  return (
    <Link href={`/flashcards/category/${id}`} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30">
      <span data-topic-color={topicColor} className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: topicColor ? "var(--topic)" : "var(--color-border)" }} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {due > 0 && <span className="rounded-full bg-[#E8564B] px-1.5 py-0.5 font-ui text-[10px] font-black text-white">{due}</span>}
    </Link>
  );
}
