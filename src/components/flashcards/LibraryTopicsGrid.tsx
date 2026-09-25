"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TopicTile, LibrarySubjectGroup } from "@/lib/flashcards";
import { CARD_COLOR_SWATCH, CARD_COLOR_TEXT } from "@/lib/card-colors";

const CARDS_PER_GROUP = 4;

// "Browse the library" (FLASHCARDS-SPEC.md "The dashboard — final
// order" § Browse the library) — every system topic, grouped by its
// admin-managed subject (flashcard_subject table), each group
// introduced by a separator row. "There is no 'add topic' step": every
// card is a plain
// link straight to the topic page — same stack-of-cards visual this
// section has always used, now with a footer naming where the visitor
// is in it ("12 due" / "✓ up to date" / "Not started").
export function LibraryTopicsGrid({ groups, isSignedIn }: { groups: LibrarySubjectGroup[]; isSignedIn: boolean }) {
  const t = useTranslations("flashcards");

  if (groups.length === 0) return null;

  const totalTopics = groups.reduce((sum, g) => sum + g.topicCount, 0);
  const totalCards = groups.reduce((sum, g) => sum + g.cardCount, 0);

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2.5">
        <h2 className="font-heading text-lg font-black text-navy">{t("fromTheLibrary")}</h2>
        <span className="font-ui text-xs font-bold text-secondary">
          {t("addFromLibrarySubtitle", { cards: totalCards, count: totalTopics })}
        </span>
      </div>

      {groups.map((group) => (
        <LibrarySubjectSection key={group.subject.id} group={group} isSignedIn={isSignedIn} />
      ))}
    </div>
  );
}

function LibrarySubjectSection({ group, isSignedIn }: { group: LibrarySubjectGroup; isSignedIn: boolean }) {
  const t = useTranslations("flashcards");
  const [expanded, setExpanded] = useState(false);
  const visibleTopics = expanded ? group.topics : group.topics.slice(0, CARDS_PER_GROUP);
  const hasMore = group.topics.length > CARDS_PER_GROUP;

  return (
    <div className="flex flex-col">
      <div className="mt-5 mb-2.5 flex items-center gap-2.5">
        <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-[3px] ${CARD_COLOR_SWATCH[group.subject.color]}`} />
        <span className={`font-ui text-xs font-black tracking-[1.6px] uppercase ${CARD_COLOR_TEXT[group.subject.color]}`}>{group.subject.name}</span>
        <span className="font-ui text-xs font-bold text-secondary">
          {t("librarySubjectCount", { count: group.topicCount, cards: group.cardCount })}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-ui text-xs font-bold text-accent hover:text-accent-hover"
          >
            {expanded ? t("showFewer") : t("librarySeeAll")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleTopics.map((topic) => (
          <LibraryTopicCard key={topic.id} topic={topic} isSignedIn={isSignedIn} />
        ))}
      </div>
    </div>
  );
}

function LibraryTopicCard({ topic, isSignedIn }: { topic: TopicTile; isSignedIn: boolean }) {
  const t = useTranslations("flashcards");
  const isComingSoon = topic.deckCount === 0;
  const isLocked = !topic.isPublic && !isSignedIn;
  const href = isLocked ? "/login" : `/flashcards/category/${topic.id}`;
  const accessibleName = isComingSoon
    ? t("topicTileLabelEmpty", { name: topic.name, decks: topic.deckCount })
    : t("libraryTopicLabel", { name: topic.name, decks: topic.deckCount, cards: topic.cardCount });

  return (
    <Link href={href} aria-label={accessibleName} data-topic-color={isLocked ? undefined : (topic.topicColor ?? undefined)} className="relative block pt-2.5">
      {/* Decorative stack behind the card — purely visual. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-0 h-[30px] rounded-2xl border-2 border-[var(--topic-bd)] bg-white opacity-60" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-1.5 top-[5px] h-[30px] rounded-2xl border-2 border-[var(--topic-bd)] bg-white opacity-85" />

      <div
        className="relative rounded-2xl border-2 p-4 transition-transform duration-base hover:-translate-y-0.5"
        style={{
          borderColor: isLocked ? "var(--color-border)" : "var(--topic-bd)",
          backgroundColor: isLocked ? "var(--color-surface-raised)" : "var(--topic-bg)",
        }}
      >
        {!isComingSoon && (
          <span
            className="absolute -top-2.5 right-3 rounded-full px-2.5 py-1 font-ui text-[11px] font-black text-white"
            style={{ backgroundColor: isLocked ? "var(--color-secondary)" : "var(--topic)" }}
          >
            {t("cardCount", { count: topic.cardCount })}
          </span>
        )}

        <h3 className="font-heading text-base font-black text-navy">{topic.name}</h3>
        <p className="mt-1 font-ui text-xs font-bold text-secondary">{isComingSoon ? t("comingSoon") : t("deckCount", { count: topic.deckCount })}</p>
        {!isComingSoon && (topic.sampleDeckTitles?.length ?? 0) > 0 && (
          <p className="mt-2 line-clamp-2 min-h-[32px] font-ui text-xs font-semibold text-secondary">{topic.sampleDeckTitles!.join(" · ")}</p>
        )}

        {!isComingSoon && (
          <div className="mt-2.5 flex items-center gap-2 border-t pt-2.5" style={{ borderColor: isLocked ? "var(--color-border)" : "var(--topic-bd)" }}>
            <LibraryCardFooterState topic={topic} />
            <span className="ml-auto font-ui text-xs font-black text-navy">{t("openTopic")}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// "The card says where you are" (FLASHCARDS-SPEC.md) — three mutually
// exclusive states, same figures the ring/state-bar elsewhere already
// derive: due beats up-to-date beats not-started, so a topic with both
// due cards and untouched ones still reads as "due" (the actionable
// state).
function LibraryCardFooterState({ topic }: { topic: TopicTile }) {
  const t = useTranslations("flashcards");
  if (topic.dueCount > 0) {
    return <span className="font-ui text-xs font-black text-[#B8262B]">{t("dueCount", { count: topic.dueCount })}</span>;
  }
  if (topic.newCount < topic.cardCount) {
    return <span className="font-ui text-xs font-black text-[#1F7A4D]">{t("studyUpToDate")}</span>;
  }
  return <span className="font-ui text-xs font-bold text-secondary">{t("libraryTopicNotStarted")}</span>;
}
