"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Lock, Plus, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TopicTile as TopicTileData } from "@/lib/flashcards";
import { toggleCategoryFavoriteAction } from "@/lib/actions/flashcards";
import { KnownPercentRing } from "./KnownPercentRing";
import { TopicStateBar } from "./TopicStateBar";

// "Your topics" (flashcards-progress-tiles.html, this dashboard
// layout's own "source of truth" — FLASHCARDS-SPEC.md, refined by
// FLASHCARDS-TOPICS-SECTION.md): every topic the visitor can see, as
// a ring tile, not a folder. Shows up whether or not the visitor has
// studied a single card in it yet — an untouched topic reads as its
// own real state (every card "due" because nothing has a due_at yet),
// not an absence. Ordered favourites first, then most due, then
// alphabetical (getDashboardTopicTiles' own ORDER BY).
export function TopicsGrid({
  topics,
  myDecksTile,
  isSignedIn,
  onNewTopicClick,
}: {
  topics: TopicTileData[];
  // Decks with no topic (flashcard_deck.category_id IS NULL) become a
  // virtual tile here rather than a database row
  // (FLASHCARDS-TOPICS-SECTION.md §3) — null when there are none.
  myDecksTile: TopicTileData | null;
  isSignedIn: boolean;
  onNewTopicClick: () => void;
}) {
  const t = useTranslations("flashcards");
  const count = topics.length + (myDecksTile ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2.5">
        <h2 className="font-heading text-lg font-black text-navy">{t("yourTopics")}</h2>
        <span className="font-ui text-xs font-bold text-secondary">{t("topicCount", { count })}</span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {topics.map((topic) => (
          <TopicTileCard key={topic.id} topic={topic} href={`/flashcards/category/${topic.id}`} isSignedIn={isSignedIn} canFavorite={isSignedIn} />
        ))}

        {/* Anchored, not routed — the decks it summarizes already live
            further down this same page (the "Decks" grid), so there's
            no separate virtual-topic page to build. */}
        {myDecksTile && <TopicTileCard topic={myDecksTile} href="#your-decks" isSignedIn={isSignedIn} canFavorite={false} />}

        {isSignedIn && (
          <button
            type="button"
            onClick={onNewTopicClick}
            className="flex min-h-[220px] flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-border p-4 text-center text-secondary hover:border-accent hover:text-accent"
          >
            <Plus className="size-6" aria-hidden="true" />
            <span className="font-ui text-sm font-black">{t("newTopic")}</span>
            <span className="max-w-[180px] font-ui text-xs text-secondary">{t("newTopicHint")}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Exported so LibraryTopicsGrid.tsx can render the exact same tile
// for a system topic — "the tile" is one component regardless of
// whether the topic is the user's own or the library's, matching
// FLASHCARDS-SPEC.md rule 1 ("same colour and same percentage
// everywhere it appears") applied to the whole card, not just the ring.
export function TopicTileCard({
  topic,
  href,
  isSignedIn,
  canFavorite,
}: {
  topic: TopicTileData;
  href: string;
  isSignedIn: boolean;
  canFavorite: boolean;
}) {
  const t = useTranslations("flashcards");
  const [favorited, setFavorited] = useState(topic.isFavorited);
  const [, startTransition] = useTransition();
  const isLocked = !topic.isPublic && !isSignedIn;
  const knownPercent = topic.cardCount === 0 ? 0 : Math.round((topic.knownCount / topic.cardCount) * 100);

  function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFavorited((v) => !v);
    startTransition(() => {
      toggleCategoryFavoriteAction(topic.id);
    });
  }

  const accessibleName =
    topic.cardCount === 0
      ? t("topicTileLabelEmpty", { name: topic.name, decks: topic.deckCount })
      : topic.dueCount > 0
        ? t("topicTileLabel", { name: topic.name, percent: knownPercent, due: topic.dueCount, decks: topic.deckCount })
        : t("topicTileLabelUpToDate", { name: topic.name, percent: knownPercent, decks: topic.deckCount });

  return (
    <Link
      href={href}
      aria-label={accessibleName}
      data-topic-color={isLocked ? undefined : (topic.topicColor ?? undefined)}
      className="relative flex flex-col items-center gap-1 rounded-[18px] border-2 p-4 text-center transition-transform duration-base hover:-translate-y-0.5"
      style={{
        borderColor: isLocked ? "var(--color-border)" : "var(--topic-bd)",
        backgroundColor: isLocked ? "var(--color-surface-raised)" : "var(--topic-bg)",
      }}
    >
      {isLocked ? (
        <span className="absolute top-3.5 right-3.5 text-secondary" title={t("membersOnly")}>
          <Lock className="size-3.5" aria-hidden="true" />
        </span>
      ) : (
        canFavorite && (
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-pressed={favorited}
            aria-label={favorited ? t("removeFromFavourites") : t("addToFavourites")}
            className={`absolute top-3.5 right-3.5 transition-colors duration-base ${favorited ? "text-card-yellow" : "text-secondary hover:text-card-yellow"}`}
          >
            <Star className="size-4" fill={favorited ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        )
      )}

      <KnownPercentRing percent={knownPercent} size={96} sublabel={t("known")} topicColor={isLocked ? undefined : (topic.topicColor ?? undefined)} />

      <span className="mt-2 font-ui text-base font-black text-navy">{topic.name}</span>
      <span className="font-ui text-xs font-bold text-secondary">{t("deckAndCardCount", { decks: topic.deckCount, cards: topic.cardCount })}</span>

      <div className="mt-2.5 w-full max-w-[160px]">
        <TopicStateBar
          newCount={topic.newCount}
          learningCount={topic.learningCount}
          reviewCount={topic.reviewCount}
          knownCount={topic.knownCount}
          topicColor={isLocked ? null : topic.topicColor}
        />
      </div>

      {topic.cardCount === 0 ? (
        <span className="mt-2.5 rounded-full border border-border bg-white px-3 py-1 font-ui text-xs font-black text-secondary">{t("addADeck")}</span>
      ) : topic.dueCount > 0 ? (
        <span className="mt-2.5 rounded-full bg-[#E8564B] px-3 py-1 font-ui text-xs font-black text-white">{t("dueCount", { count: topic.dueCount })}</span>
      ) : (
        <span className="mt-2.5 rounded-full border border-[#BFE3D0] bg-white px-3 py-1 font-ui text-xs font-black text-[#1F7A4D]">{t("studyUpToDate")}</span>
      )}
    </Link>
  );
}
