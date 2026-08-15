"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DeckSummary } from "@/lib/flashcards";
import { toggleDeckFavoriteAction } from "@/lib/actions/flashcards";
import { DeckIconEditor } from "./DeckIconEditor";
import { StartDeckButton } from "./StartDeckButton";

// Table layout for a folder's decks, mirroring Question Bank's
// QuestionSetTable — same reasoning applies once a folder holds more
// than a couple of decks. Icon editing isn't offered inline here (same
// as QuestionSetTable offers no inline set editing) — DeckIconEditor is
// rendered with canEdit={false} purely to reuse its icon-resolution/
// fallback logic for a static avatar; real editing still happens from
// the deck's own detail page.
export function DeckTable({
  decks,
  isSignedIn,
  favoritedDeckIds,
}: {
  decks: DeckSummary[];
  isSignedIn: boolean;
  favoritedDeckIds: Set<string>;
}) {
  const t = useTranslations("flashcards");

  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse font-ui text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised text-left text-[11px] tracking-wide text-secondary uppercase">
              <th className="px-4 py-2.5 font-medium">{t("columnDeck")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("columnCards")}</th>
              <th className="px-4 py-2.5 font-medium">{t("columnMastered")}</th>
              <th className="px-4 py-2.5" />
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {decks.map((deck) => (
              <DeckTableRow
                key={deck.id}
                deck={deck}
                isSignedIn={isSignedIn}
                isFavorited={favoritedDeckIds.has(deck.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeckTableRow({
  deck,
  isSignedIn,
  isFavorited,
}: {
  deck: DeckSummary;
  isSignedIn: boolean;
  isFavorited: boolean;
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
    <tr className="border-b border-border last:border-0 hover:bg-surface-raised/60">
      <td className="px-4 py-3">
        <Link href={`/flashcards/${deck.id}`} className="flex items-center gap-3">
          <DeckIconEditor
            deckId={deck.id}
            icon={deck.icon}
            iconUrl={deck.iconUrl}
            color={deck.color}
            canEdit={false}
            sizeClass="size-9"
            iconSizeClass="size-4"
          />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-medium text-primary">{deck.name}</span>
            {deck.description && <span className="truncate text-xs text-secondary">{deck.description}</span>}
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 text-right text-secondary tabular-nums">{deck.cardCount}</td>
      <td className="px-4 py-3">
        {masteredPct !== null ? (
          <div className="flex items-center gap-2">
            <span className="font-medium tabular-nums text-primary">{masteredPct}%</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border/40">
              <div className="h-full rounded-full bg-accent" style={{ width: `${masteredPct}%` }} />
            </div>
          </div>
        ) : (
          <span className="text-secondary">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {isSignedIn && (
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-pressed={favorited}
            aria-label={favorited ? t("removeFromFavourites") : t("addToFavourites")}
            className={`transition-colors duration-base ${
              favorited ? "text-card-yellow" : "text-secondary hover:text-card-yellow"
            }`}
          >
            <Star className="size-4.5" fill={favorited ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <StartDeckButton deck={deck} isSignedIn={isSignedIn} variant="table" />
      </td>
    </tr>
  );
}
