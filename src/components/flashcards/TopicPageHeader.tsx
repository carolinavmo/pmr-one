"use client";

import { useTranslations } from "next-intl";
import { Play, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TopicColor } from "@/lib/flashcard-topic-colors";
import { KnownPercentRing } from "./KnownPercentRing";
import { TopicStateBar } from "./TopicStateBar";

// "Header is the tile enlarged: 124px ring... The topic page is the
// tile, enlarged. Same ring, same colours, same state bar — so
// opening a tile feels like zooming in rather than arriving
// somewhere new." (FLASHCARDS-IMPLEMENTATION.md / FLASHCARDS-SPEC.md)
export function TopicPageHeader({
  categoryId,
  name,
  topicColor,
  deckCount,
  cardCount,
  knownPercent,
  dueToday,
  newCount,
  learningCount,
  reviewCount,
  knownCount,
  onNewDeckClick,
}: {
  categoryId: string;
  name: string;
  topicColor: TopicColor | null;
  deckCount: number;
  cardCount: number;
  knownPercent: number;
  dueToday: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  knownCount: number;
  onNewDeckClick: () => void;
}) {
  const t = useTranslations("flashcards");

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center">
      <KnownPercentRing percent={knownPercent} size={124} sublabel={t("known")} topicColor={topicColor ?? undefined} />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h1 className="font-reading text-2xl text-primary">{name}</h1>
          <p className="font-ui text-sm text-secondary">{t("deckAndCardCount", { decks: deckCount, cards: cardCount })}</p>
        </div>

        <TopicStateBar newCount={newCount} learningCount={learningCount} reviewCount={reviewCount} knownCount={knownCount} topicColor={topicColor} showLegend />

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/flashcards/study?topic=${categoryId}`}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 font-ui text-sm font-bold text-white hover:bg-accent-hover"
          >
            <Play className="size-3.5" aria-hidden="true" />
            {dueToday > 0 ? t("studyNDue", { count: dueToday }) : t("studyUpToDate")}
          </Link>
          <button
            type="button"
            onClick={onNewDeckClick}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 font-ui text-sm font-bold text-secondary hover:bg-border/30 hover:text-primary"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {t("newDeck")}
          </button>
        </div>
      </div>
    </div>
  );
}
