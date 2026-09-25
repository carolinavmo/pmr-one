"use client";

import { useTranslations } from "next-intl";
import { Play, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TopicColor } from "@/lib/flashcard-topic-colors";
import { SUBJECT_LABEL_KEY, type FlashcardSubject } from "@/lib/flashcard-subjects";
import type { DeckOwnerType } from "@/lib/flashcards";
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
  ownerType,
  subject,
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
  ownerType: DeckOwnerType;
  subject: FlashcardSubject;
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
    <div
      data-topic-color={topicColor ?? undefined}
      className="flex flex-col gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: topicColor ? "var(--topic-bd)" : "var(--color-border)",
        backgroundColor: topicColor ? "var(--topic-bg)" : "var(--color-surface)",
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
        <KnownPercentRing percent={knownPercent} size={124} sublabel={t("known")} topicColor={topicColor ?? undefined} />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <h1 className="font-reading text-2xl text-primary">{name}</h1>
            <p className="font-ui text-sm text-secondary">
              {ownerType === "system"
                ? t("deckAndCardCountFromLibrary", { decks: deckCount, cards: cardCount, subject: t(SUBJECT_LABEL_KEY[subject]) })
                : t("deckAndCardCount", { decks: deckCount, cards: cardCount })}
            </p>
          </div>

          <TopicStateBar newCount={newCount} learningCount={learningCount} reviewCount={reviewCount} knownCount={knownCount} topicColor={topicColor} showLegend />
        </div>
      </div>

      {/* Right-aligned action stack on wider screens — "the tile
          enlarged" carries the tile's own single-column action list
          along with it, rather than the actions running inline under
          the title. */}
      <div className="flex shrink-0 flex-col gap-2 sm:w-44">
        <Link
          href={`/flashcards/study?topic=${categoryId}`}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 font-ui text-sm font-bold text-white hover:bg-accent-hover"
        >
          <Play className="size-3.5" aria-hidden="true" />
          {dueToday > 0 ? t("studyNDue", { count: dueToday }) : t("studyUpToDate")}
        </Link>
        <button
          type="button"
          onClick={onNewDeckClick}
          className="flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 font-ui text-sm font-bold text-secondary hover:bg-border/30 hover:text-primary"
          style={{ borderColor: topicColor ? "var(--topic-bd)" : "var(--color-border)" }}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t("newDeck")}
        </button>
      </div>
    </div>
  );
}
