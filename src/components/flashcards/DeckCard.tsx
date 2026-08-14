"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DeckSummary } from "@/lib/flashcards";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import { toggleDeckFavoriteAction } from "@/lib/actions/flashcards";
import { DeckIconEditor } from "./DeckIconEditor";

export function DeckCard({
  deck,
  isFavorited,
  isSignedIn,
  canEdit,
}: {
  deck: DeckSummary;
  isFavorited: boolean;
  isSignedIn: boolean;
  canEdit: boolean;
}) {
  const t = useTranslations("flashcards");
  const [favorited, setFavorited] = useState(isFavorited);
  const [, startTransition] = useTransition();
  const masteredPct =
    deck.masteredCount !== null && deck.cardCount > 0
      ? Math.round((deck.masteredCount / deck.cardCount) * 100)
      : null;

  function handleToggleFavorite() {
    setFavorited((v) => !v);
    startTransition(() => {
      toggleDeckFavoriteAction(deck.id);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`w-fit rounded-full px-2.5 py-1 font-ui text-xs font-medium ${CARD_COLOR_CHIP[deck.color]}`}
        >
          {deck.topicLabel ?? t("myDeckTag")}
        </span>
        {isSignedIn && (
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-pressed={favorited}
            aria-label={favorited ? t("removeFromFavourites") : t("addToFavourites")}
            className={`shrink-0 transition-colors duration-base ${
              favorited ? "text-card-yellow" : "text-secondary hover:text-card-yellow"
            }`}
          >
            <Star className="size-4.5" fill={favorited ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <DeckIconEditor
          deckId={deck.id}
          icon={deck.icon}
          iconUrl={deck.iconUrl}
          color={deck.color}
          canEdit={canEdit}
        />
        <Link href={`/flashcards/${deck.id}`} className="flex min-w-0 flex-col gap-0.5">
          <span className="line-clamp-2 font-ui text-sm font-semibold text-primary">{deck.name}</span>
          <span className="font-ui text-xs text-secondary">{t("cardCount", { count: deck.cardCount })}</span>
        </Link>
      </div>

      {masteredPct !== null && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/40">
            <div className="h-full rounded-full bg-accent" style={{ width: `${masteredPct}%` }} />
          </div>
          <span className="font-ui text-xs text-secondary tabular-nums">{masteredPct}%</span>
        </div>
      )}

      <Link
        href={`/flashcards/${deck.id}`}
        className="mt-auto rounded-lg bg-accent px-3 py-2 text-center font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover"
      >
        {t("studyDeck")}
      </Link>
    </div>
  );
}
