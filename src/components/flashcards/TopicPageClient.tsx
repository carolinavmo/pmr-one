"use client";

import { useEffect, useState } from "react";
import type { DeckSummary, FlashcardCategory, TopicDeckRow, TopicCardRow, TopicMetrics, WeakCard, FlashcardSubjectRow } from "@/lib/flashcards";
import type { TopicColor } from "@/lib/flashcard-topic-colors";
import { TopicPageHeader } from "./TopicPageHeader";
import { TopicMetricTiles } from "./TopicMetricTiles";
import { TopicWeakCards } from "./TopicWeakCards";
import { TopicPageTabs, type TopicTab } from "./TopicPageTabs";

// Owns the small slice of state a Settings-tab edit needs to reach the
// always-visible header above it (rename, topic colour) — split out
// from the page's own Server Component since both live under one
// shared "source of truth" for the identity TopicPageHeader shows.
export function TopicPageClient({
  category,
  deckRows,
  cardCount,
  allCards,
  metrics,
  weakCards,
  canManage,
  decksInFolder,
  assignableDecks,
  subjects,
}: {
  category: FlashcardCategory;
  deckRows: TopicDeckRow[];
  cardCount: number;
  allCards: TopicCardRow[] | null;
  metrics: TopicMetrics | null;
  weakCards: WeakCard[];
  canManage: boolean;
  decksInFolder: DeckSummary[];
  assignableDecks: DeckSummary[];
  subjects: FlashcardSubjectRow[];
}) {
  const [name, setName] = useState(category.name);
  const [topicColor, setTopicColor] = useState<TopicColor | null>(category.topicColor);
  const [tab, setTab] = useState<TopicTab>("decks");
  // Hydration-safe "now" for every format.relativeTime() call on this
  // page (deck rows' "studied X ago", the metric tiles' "next review")
  // — same pattern AtlasPageHeader.tsx/AtlasIndex.tsx already use, so
  // server and client agree on a render before the clock moves.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate hydration-safe pattern, see AtlasIndex.tsx
    setNow(new Date());
  }, []);

  const newCount = deckRows.reduce((sum, d) => sum + d.newCount, 0);
  const learningCount = deckRows.reduce((sum, d) => sum + d.learningCount, 0);
  const reviewCount = deckRows.reduce((sum, d) => sum + d.reviewCount, 0);
  const knownCount = deckRows.reduce((sum, d) => sum + d.knownCount, 0);

  return (
    <div className="flex flex-col gap-5">
      <TopicPageHeader
        categoryId={category.id}
        name={name}
        topicColor={topicColor}
        ownerType={category.ownerType}
        subjectName={category.subjectName}
        deckCount={deckRows.length}
        cardCount={cardCount}
        knownPercent={metrics?.knownPercent ?? 0}
        dueToday={metrics?.dueToday ?? 0}
        newCount={newCount}
        learningCount={learningCount}
        reviewCount={reviewCount}
        knownCount={knownCount}
        onNewDeckClick={() => setTab("decks")}
      />

      {metrics && (
        <TopicMetricTiles dueToday={metrics.dueToday} retentionPercent={metrics.retentionPercent} nextReviewAt={metrics.nextReviewAt} lapsesThisWeek={metrics.lapsesThisWeek} now={now} />
      )}

      <TopicPageTabs
        category={{ ...category, name, topicColor }}
        topicColor={topicColor}
        deckRows={deckRows}
        allCards={allCards}
        metrics={metrics}
        canManage={canManage}
        decksInFolder={decksInFolder}
        assignableDecks={assignableDecks}
        subjects={subjects}
        onTopicColorChanged={setTopicColor}
        onRenamed={setName}
        onNewDeckClick={() => setTab("decks")}
        tab={tab}
        onTabChange={setTab}
        now={now}
      />

      <TopicWeakCards cards={weakCards} categoryId={category.id} />
    </div>
  );
}
