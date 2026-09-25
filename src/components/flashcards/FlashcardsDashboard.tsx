"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { DashboardMetrics, ForecastDay, FlashcardCategory, TopicDeckRow, TopicTile, LibrarySubjectGroup, DashboardProgress } from "@/lib/flashcards";
import { FlashcardsHeader } from "./FlashcardsHeader";
import { FlashcardsSessionPanel } from "./FlashcardsSessionPanel";
import { FlashcardsRail } from "./FlashcardsRail";
import { LibraryTopicsGrid } from "./LibraryTopicsGrid";
import { FlashcardsProgressPanels } from "./FlashcardsProgressPanels";
import { ProgressByTopicRows } from "./ProgressByTopicRows";
import { DashboardDeckCard } from "./DashboardDeckCard";
import { NewDeckDrawer } from "./NewDeckDrawer";
import { NewCategoryDrawer } from "./NewCategoryDrawer";

// Top-level client wrapper for the redesigned /flashcards dashboard
// (FLASHCARDS-IMPLEMENTATION.md Pass 4) — owns the rail's search text
// and both "new" drawers, same role TopicPageClient.tsx plays for the
// topic page. The rail (FlashcardsRail.tsx) sits where SidebarFrame's
// library tree normally would; SidebarFrame hides itself on this exact
// route so the two never render at once.
//
// System topics are directly studyable — no "add to my account" step.
// The old tile grid for a visitor's own topic folders ("Your topics")
// was removed — those folders still surface as rows in "Progress by
// topic" below, and are still creatable from the rail's own "My
// Folders" +, so nothing here was the only path to either.
export function FlashcardsDashboard({
  metrics,
  forecast,
  deckRows,
  topics,
  libraryTopics,
  libraryGroups,
  progress,
  systemCategories,
  userCategories,
  folderDueBadges,
  isSignedIn,
  isEditor,
}: {
  // null for a signed-out visitor — every field here is personal
  // (progress, streak, due dates), so there's nothing meaningful to
  // show; the session panel is skipped entirely rather than faking it.
  metrics: DashboardMetrics | null;
  forecast: ForecastDay[];
  deckRows: TopicDeckRow[];
  topics: TopicTile[];
  libraryTopics: TopicTile[];
  libraryGroups: LibrarySubjectGroup[];
  // null for a signed-out visitor, same reasoning as `metrics`.
  progress: DashboardProgress | null;
  systemCategories: FlashcardCategory[];
  userCategories: FlashcardCategory[];
  folderDueBadges: Record<string, number>;
  isSignedIn: boolean;
  isEditor: boolean;
}) {
  const t = useTranslations("flashcards");
  const [query, setQuery] = useState("");
  const [deckDrawerOpen, setDeckDrawerOpen] = useState(false);
  const [systemFolderDrawerOpen, setSystemFolderDrawerOpen] = useState(false);
  const [userFolderDrawerOpen, setUserFolderDrawerOpen] = useState(false);
  // Hydration-safe "now" for the deck cards' relativeTime() calls —
  // same pattern as TopicPageClient.tsx.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate hydration-safe pattern, see AtlasIndex.tsx
    setNow(new Date());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deckRows;
    return deckRows.filter((deck) => deck.name.toLowerCase().includes(q));
  }, [deckRows, query]);

  const favoritedCount = deckRows.filter((d) => d.isFavorited).length;
  const totalCards = deckRows.reduce((sum, d) => sum + d.cardCount, 0);
  // Decks with no topic become a virtual "My decks" tile in the grid
  // rather than a database row (FLASHCARDS-TOPICS-SECTION.md §3) —
  // summed straight from deckRows, no extra query. It links to
  // "#your-decks" below instead of a category page, since that's
  // where these decks already live on this same dashboard.
  const myDecksTile: TopicTile | null =
    deckRows.length === 0
      ? null
      : {
          id: "unfiled",
          name: t("myDecksTopicName"),
          topicColor: "sky",
          isPublic: true,
          isFavorited: false,
          deckCount: deckRows.length,
          cardCount: totalCards,
          newCount: deckRows.reduce((sum, d) => sum + d.newCount, 0),
          learningCount: deckRows.reduce((sum, d) => sum + d.learningCount, 0),
          reviewCount: deckRows.reduce((sum, d) => sum + d.reviewCount, 0),
          knownCount: deckRows.reduce((sum, d) => sum + d.knownCount, 0),
          dueCount: deckRows.reduce((sum, d) => sum + d.dueCount, 0),
        };
  // Pass 5: "no decks" needs to say what to do next, which is a
  // different message from "no decks match your search" or "every
  // deck is filed into a folder" — a brand-new account/library with
  // nothing anywhere yet is its own empty state, not a fallback of
  // the filed-decks one.
  const libraryIsEmpty = deckRows.length === 0 && systemCategories.length === 0 && userCategories.length === 0;
  // "Progress by topic" (Pass 4) reuses the exact same set of tiles
  // already on this page — library + your topics + the virtual "My
  // decks" bucket — just as rows instead, so it needs no extra query.
  const progressTopics: TopicTile[] = [...libraryTopics, ...topics, ...(myDecksTile ? [myDecksTile] : [])];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <FlashcardsRail
        query={query}
        onQueryChange={setQuery}
        onNewDeckClick={() => setDeckDrawerOpen(true)}
        onNewFolderClick={() => setUserFolderDrawerOpen(true)}
        dueToday={metrics?.dueToday ?? 0}
        favoritedCount={favoritedCount}
        topics={topics}
        libraryTopics={libraryTopics}
        systemCategories={systemCategories}
        folderDueBadges={folderDueBadges}
        isSignedIn={isSignedIn}
        isEditor={isEditor}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <FlashcardsHeader streak={metrics?.streak ?? null} retentionPercent={metrics?.retentionPercent ?? null} totalCards={metrics?.totalCards ?? totalCards} />

        {metrics && (
          <FlashcardsSessionPanel
            dueToday={metrics.dueToday}
            estimatedMinutes={metrics.estimatedMinutes}
            newCount={metrics.newCount}
            learningCount={metrics.learningCount}
            reviewCount={metrics.reviewCount}
            forecast={forecast}
          />
        )}

        {isEditor && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSystemFolderDrawerOpen(true)}
              className="font-ui text-xs font-medium text-accent hover:text-accent-hover"
            >
              {t("newFolder")}
            </button>
          </div>
        )}

        <LibraryTopicsGrid groups={libraryGroups} isSignedIn={isSignedIn} />

        {progress && <FlashcardsProgressPanels progress={progress} now={now} />}

        <ProgressByTopicRows topics={progressTopics} />

        {/* Scroll target for the "My decks" virtual tile above — these
            unfiled decks already live here, so the tile anchors down
            to them instead of routing to a page that doesn't exist. */}
        <div id="your-decks" className="flex flex-col gap-4 scroll-mt-6">
          {deckRows.length > 0 && <h2 className="font-heading text-lg font-black text-navy">{t("myDecksTopicName")}</h2>}

          {filtered.length === 0 ? (
            libraryIsEmpty ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
                <p className="font-ui text-sm text-secondary">{t("noDecksYet")}</p>
                {isSignedIn && (
                  <button
                    type="button"
                    onClick={() => setDeckDrawerOpen(true)}
                    className="rounded-lg bg-accent px-4 py-2 font-ui text-sm font-bold text-white hover:bg-accent-hover"
                  >
                    {t("createFirstDeck")}
                  </button>
                )}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">
                {query.trim() ? t("noDecksMatch") : t("allDecksInFolders")}
              </p>
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((deck) => (
                <DashboardDeckCard key={deck.id} deck={deck} isSignedIn={isSignedIn} now={now} />
              ))}
            </div>
          )}
        </div>
      </div>

      <NewDeckDrawer open={deckDrawerOpen} onClose={() => setDeckDrawerOpen(false)} />
      <NewCategoryDrawer open={systemFolderDrawerOpen} onClose={() => setSystemFolderDrawerOpen(false)} ownerType="system" />
      <NewCategoryDrawer open={userFolderDrawerOpen} onClose={() => setUserFolderDrawerOpen(false)} ownerType="user" />
    </div>
  );
}
