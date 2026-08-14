"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, List, Layers, Plus, Search, ChevronRight, Star, FolderPlus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { DeckSummary, FlashcardCategory } from "@/lib/flashcards";
import { CARD_COLOR_CHIP, CARD_COLOR_SWATCH } from "@/lib/card-colors";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";
import { MacFolderIcon } from "@/components/ui/MacFolderIcon";
import type { CardColor } from "@/lib/editorial-blocks";
import { toggleDeckFavoriteAction } from "@/lib/actions/flashcards";
import { DeckCard } from "./DeckCard";
import { NewDeckDrawer } from "./NewDeckDrawer";
import { NewCategoryDrawer } from "./NewCategoryDrawer";

type ViewMode = "grid" | "list";

// Server-fetched preset + user decks handed down as props (same split
// ClinicalToolsBrowser.tsx already uses) — search/view state is small
// and client-only, no separate search API route. Preset and user decks
// are merged into one browsable list, searched together; folders
// (categories) are a separate server-fetched entity (db/migrations
// /0044_flashcard_categories.sql, ownership split in 0045) rather than
// derived from presetDecks, so an empty folder still shows up here.
export function FlashcardsBrowser({
  presetDecks,
  userDecks,
  systemCategories,
  userCategories,
  favoritedCount,
  favoritedDeckIds,
  isSignedIn,
  isEditor,
}: {
  presetDecks: DeckSummary[];
  userDecks: DeckSummary[];
  systemCategories: FlashcardCategory[];
  userCategories: FlashcardCategory[];
  favoritedCount: number;
  favoritedDeckIds: Set<string>;
  isSignedIn: boolean;
  isEditor: boolean;
}) {
  const t = useTranslations("flashcards");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [systemFolderDrawerOpen, setSystemFolderDrawerOpen] = useState(false);
  const [userFolderDrawerOpen, setUserFolderDrawerOpen] = useState(false);

  // A deck already filed into a folder only shows up there, not
  // duplicated on the main dashboard grid below — the folder tiles
  // above are the way into it now.
  const unfiledDecks = useMemo(
    () => [...presetDecks, ...userDecks].filter((deck) => deck.categoryId === null),
    [presetDecks, userDecks]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unfiledDecks;
    return unfiledDecks.filter(
      (deck) => deck.name.toLowerCase().includes(q) || deck.description.toLowerCase().includes(q)
    );
  }, [unfiledDecks, query]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-secondary"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-full border border-border bg-surface-raised py-2.5 pr-4 pl-10 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label={t("viewGrid")}
              aria-pressed={view === "grid"}
              className={`flex size-8 items-center justify-center rounded-full transition-colors duration-base ${
                view === "grid" ? "bg-accent text-white" : "text-secondary hover:text-primary"
              }`}
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label={t("viewList")}
              aria-pressed={view === "list"}
              className={`flex size-8 items-center justify-center rounded-full transition-colors duration-base ${
                view === "list" ? "bg-accent text-white" : "text-secondary hover:text-primary"
              }`}
            >
              <List className="size-4" aria-hidden="true" />
            </button>
          </div>

          {isSignedIn ? (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-2 font-ui text-sm font-medium text-white hover:bg-accent-hover"
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("newDeck")}
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 font-ui text-sm font-medium text-primary hover:bg-border/40"
            >
              {t("signInLink")}
            </Link>
          )}
        </div>
      </div>

      {(systemCategories.length > 0 || isEditor) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs font-medium text-secondary">{t("folders")}</span>
            {isEditor && (
              <button
                type="button"
                onClick={() => setSystemFolderDrawerOpen(true)}
                className="flex items-center gap-1.5 font-ui text-xs font-medium text-accent hover:text-accent-hover"
              >
                <FolderPlus className="size-3.5" aria-hidden="true" />
                {t("newFolder")}
              </button>
            )}
          </div>
          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {systemCategories.map((cat) => (
                <CategoryCard key={cat.id} id={cat.id} label={cat.name} icon={cat.icon} color={cat.color} count={cat.deckCount} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface-raised">
              {systemCategories.map((cat) => (
                <CategoryListRow key={cat.id} id={cat.id} label={cat.name} color={cat.color} count={cat.deckCount} />
              ))}
            </div>
          )}
        </div>
      )}

      {isSignedIn && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs font-medium text-secondary">{t("myFolders")}</span>
            <button
              type="button"
              onClick={() => setUserFolderDrawerOpen(true)}
              className="flex items-center gap-1.5 font-ui text-xs font-medium text-accent hover:text-accent-hover"
            >
              <FolderPlus className="size-3.5" aria-hidden="true" />
              {t("newFolder")}
            </button>
          </div>
          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <FavouritesFolderCard count={favoritedCount} />
              {userCategories.map((cat) => (
                <CategoryCard key={cat.id} id={cat.id} label={cat.name} icon={cat.icon} color={cat.color} count={cat.deckCount} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface-raised">
              <FavouritesListRow count={favoritedCount} />
              {userCategories.map((cat) => (
                <CategoryListRow key={cat.id} id={cat.id} label={cat.name} color={cat.color} count={cat.deckCount} />
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">
          {query.trim() ? t("noDecksMatch") : t("allDecksInFolders")}
        </p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              isFavorited={favoritedDeckIds.has(deck.id)}
              isSignedIn={isSignedIn}
              canEdit={deck.ownerType === "user" || isEditor}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface-raised">
          {filtered.map((deck) => (
            <DeckListRow
              key={deck.id}
              deck={deck}
              isFavorited={favoritedDeckIds.has(deck.id)}
              isSignedIn={isSignedIn}
            />
          ))}
        </div>
      )}

      <NewDeckDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <NewCategoryDrawer
        open={systemFolderDrawerOpen}
        onClose={() => setSystemFolderDrawerOpen(false)}
        ownerType="system"
      />
      <NewCategoryDrawer
        open={userFolderDrawerOpen}
        onClose={() => setUserFolderDrawerOpen(false)}
        ownerType="user"
      />
    </div>
  );
}

// Not a real folder — a computed view over the signed-in member's own
// favorited decks (src/lib/flashcards.ts's getFavoritedDecks), always
// shown first in "My Folders" once signed in, count 0 included (same
// honesty-over-hiding-empty-state reasoning the stats row already
// uses). Its own /flashcards/favourites route, not /category/[id].
function FavouritesFolderCard({ count }: { count: number }) {
  const t = useTranslations("flashcards");

  return (
    <Link
      href="/flashcards/favourites"
      className="group relative flex flex-col pt-2 text-left transition-transform duration-base hover:-translate-y-0.5"
    >
      <span aria-hidden="true" className="absolute top-0 left-4 h-4 w-14 rounded-t-lg bg-card-yellow opacity-90" />
      <span className="relative flex h-28 flex-col justify-between rounded-2xl bg-card-yellow p-3.5 shadow-sm transition-shadow duration-base group-hover:shadow-md sm:h-32">
        <span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-white">
          <Star className="size-4" aria-hidden="true" />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="line-clamp-1 font-ui text-sm font-semibold text-white">{t("favourites")}</span>
          <span className="font-ui text-xs text-white/75">{t("deckCount", { count })}</span>
        </span>
      </span>
    </Link>
  );
}

// A big colored "folder" tile (founder reference: a bold rounded card
// with a small tab peeking out above it) — the tab is a second,
// slightly smaller same-color rectangle stacked behind the main face
// via z-index, not an actual clipped folder silhouette, which keeps
// this a plain two-div shape instead of hand-drawn SVG path data.
// Clicking navigates to the folder's own page (src/app/[locale]
// /flashcards/category/[categoryId]/page.tsx) rather than filtering
// in place.
function CategoryCard({
  id,
  label,
  icon,
  color,
  count,
}: {
  id: string;
  label: string;
  icon: CardIconName | undefined;
  color: CardColor;
  count: number;
}) {
  const t = useTranslations("flashcards");
  const Icon = icon ? cardIcons[icon] : Layers;

  return (
    <Link
      href={`/flashcards/category/${id}`}
      className="group relative flex flex-col pt-2 text-left transition-transform duration-base hover:-translate-y-0.5"
    >
      <span
        aria-hidden="true"
        className={`absolute top-0 left-4 h-4 w-14 rounded-t-lg ${CARD_COLOR_SWATCH[color]} opacity-90`}
      />
      <span
        className={`relative flex h-28 flex-col justify-between rounded-2xl p-3.5 shadow-sm transition-shadow duration-base group-hover:shadow-md sm:h-32 ${CARD_COLOR_SWATCH[color]}`}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-white">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="line-clamp-1 font-ui text-sm font-semibold text-white">{label}</span>
          <span className="font-ui text-xs text-white/75">{t("deckCount", { count })}</span>
        </span>
      </span>
    </Link>
  );
}

// List-view counterpart to CategoryCard — same folder tiles, same
// navigation target, just the compact row treatment DeckListRow
// already established for the deck grid's own list view.
function CategoryListRow({
  id,
  label,
  color,
  count,
}: {
  id: string;
  label: string;
  color: CardColor;
  count: number;
}) {
  const t = useTranslations("flashcards");

  return (
    <Link
      href={`/flashcards/category/${id}`}
      className="flex items-center gap-3 p-3.5 transition-colors duration-base hover:opacity-80"
    >
      <span className="flex size-10 shrink-0 items-center justify-center">
        <MacFolderIcon color={color} className="size-8 drop-shadow-sm" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-ui text-sm font-semibold text-primary">{label}</span>
        <span className="font-ui text-xs text-secondary">{t("deckCount", { count })}</span>
      </div>
      <ChevronRight className="size-4 shrink-0 text-secondary" aria-hidden="true" />
    </Link>
  );
}

// List-view counterpart to FavouritesFolderCard.
function FavouritesListRow({ count }: { count: number }) {
  const t = useTranslations("flashcards");

  return (
    <Link
      href="/flashcards/favourites"
      className="flex items-center gap-3 p-3.5 transition-colors duration-base hover:opacity-80"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card-yellow/15 text-card-yellow">
        <Star className="size-4.5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-ui text-sm font-semibold text-primary">{t("favourites")}</span>
        <span className="font-ui text-xs text-secondary">{t("deckCount", { count })}</span>
      </div>
      <ChevronRight className="size-4 shrink-0 text-secondary" aria-hidden="true" />
    </Link>
  );
}

function DeckListRow({
  deck,
  isFavorited,
  isSignedIn,
}: {
  deck: DeckSummary;
  isFavorited: boolean;
  isSignedIn: boolean;
}) {
  const t = useTranslations("flashcards");
  const [favorited, setFavorited] = useState(isFavorited);
  const [, startTransition] = useTransition();
  const masteredPct =
    deck.masteredCount !== null && deck.cardCount > 0
      ? Math.round((deck.masteredCount / deck.cardCount) * 100)
      : null;
  const Icon = deck.icon ? cardIcons[deck.icon] : Layers;

  function handleToggleFavorite() {
    setFavorited((v) => !v);
    startTransition(() => {
      toggleDeckFavoriteAction(deck.id);
    });
  }

  return (
    <div className="flex items-center gap-3 p-3.5">
      <Link
        href={`/flashcards/${deck.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 transition-colors duration-base hover:opacity-80"
      >
        {deck.iconUrl ? (
          <img src={deck.iconUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[deck.color]}`}>
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-ui text-sm font-semibold text-primary">{deck.name}</span>
          <span className="font-ui text-xs text-secondary">
            {deck.topicLabel ?? t("myDeckTag")} · {t("cardCount", { count: deck.cardCount })}
          </span>
        </div>
        {masteredPct !== null && (
          <div className="hidden w-24 shrink-0 items-center gap-2 sm:flex">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/40">
              <div className="h-full rounded-full bg-accent" style={{ width: `${masteredPct}%` }} />
            </div>
            <span className="font-ui text-xs text-secondary tabular-nums">{masteredPct}%</span>
          </div>
        )}
      </Link>
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
          <Star className="size-4" fill={favorited ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      )}
      <ChevronRight className="size-4 shrink-0 text-secondary" aria-hidden="true" />
    </div>
  );
}
