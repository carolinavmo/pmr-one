"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TopicDeckRow } from "@/lib/flashcards";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import { toggleDeckFavoriteAction } from "@/lib/actions/flashcards";
import { TopicStateBar } from "./TopicStateBar";

// Dashboard grid tile (FLASHCARDS-SPEC.md's deck-card table: tag,
// star, title, source line, new/learning/known counts + bar, meta,
// action) — the card-shaped sibling of TopicDeckRowItem.tsx's row,
// same data shape (TopicDeckRow, reused here rather than forked since
// getDashboardDeckRows already returns it) and same three-way action
// rule (Study N due / Review early / Open).
export function DashboardDeckCard({ deck, isSignedIn, now }: { deck: TopicDeckRow; isSignedIn: boolean; now: Date | null }) {
  const t = useTranslations("flashcards");
  const format = useFormatter();
  const [favorited, setFavorited] = useState(deck.isFavorited);
  const [, startTransition] = useTransition();

  const knownPercent = deck.cardCount === 0 ? 0 : Math.round((deck.knownCount / deck.cardCount) * 100);

  function handleToggleFavorite() {
    setFavorited((v) => !v);
    startTransition(() => {
      toggleDeckFavoriteAction(deck.id);
    });
  }

  const action =
    deck.cardCount === 0 ? (
      <Link href={`/flashcards/${deck.id}`} className="mt-auto rounded-lg border border-border px-3 py-2 text-center font-ui text-sm font-bold text-primary hover:bg-border/30">
        {t("addCards")}
      </Link>
    ) : deck.dueCount > 0 ? (
      <Link href={`/flashcards/study?deck=${deck.id}`} className="mt-auto rounded-lg bg-accent px-3 py-2 text-center font-ui text-sm font-bold text-white hover:bg-accent-hover">
        {t("studyNDue", { count: deck.dueCount })}
      </Link>
    ) : (
      <Link
        href={`/flashcards/study?deck=${deck.id}&early=1`}
        className="mt-auto rounded-lg border border-border px-3 py-2 text-center font-ui text-sm font-bold text-primary hover:bg-border/30"
      >
        {t("reviewEarly")}
      </Link>
    );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={`w-fit rounded-full px-2.5 py-1 font-ui text-xs font-medium ${CARD_COLOR_CHIP[deck.color]}`}>
          {deck.sourceDiseaseName ? t("fromTheLibrary") : t("createdByYou")}
        </span>
        {isSignedIn && (
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-pressed={favorited}
            aria-label={favorited ? t("removeFromFavourites") : t("addToFavourites")}
            className={`shrink-0 transition-colors duration-base ${favorited ? "text-card-yellow" : "text-secondary hover:text-card-yellow"}`}
          >
            <Star className="size-4.5" fill={favorited ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        )}
      </div>

      <Link href={`/flashcards/${deck.id}`} className="flex flex-col gap-0.5">
        <span className="line-clamp-2 font-ui text-sm font-semibold text-primary">{deck.name}</span>
        <span className="font-ui text-xs text-secondary">
          {t("cardCount", { count: deck.cardCount })}
          {deck.lastStudiedAt && now ? ` · ${t("studiedRelative", { time: format.relativeTime(new Date(deck.lastStudiedAt), now) })}` : ""}
        </span>
      </Link>

      <TopicStateBar newCount={deck.newCount} learningCount={deck.learningCount} reviewCount={deck.reviewCount} knownCount={deck.knownCount} topicColor={null} height={6} />

      <div className="flex items-center justify-between font-ui text-xs text-secondary">
        <span>{t("known")} {knownPercent}%</span>
        {deck.dueCount > 0 && <span className="font-bold text-[#E8564B]">{t("dueToday")} {deck.dueCount}</span>}
      </div>

      {action}
    </div>
  );
}
