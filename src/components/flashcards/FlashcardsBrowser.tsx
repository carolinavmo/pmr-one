"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, List, Layers, Plus, Search, ChevronRight, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { DeckSummary } from "@/lib/flashcards";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import { cardIcons } from "@/components/ui/cardIcons";
import { toggleDeckFavoriteAction } from "@/lib/actions/flashcards";
import { DeckCard } from "./DeckCard";
import { NewDeckDrawer } from "./NewDeckDrawer";

type ViewMode = "grid" | "list";

// Server-fetched preset + user decks handed down as props (same split
// ClinicalToolsBrowser.tsx already uses) — search/topic-filter/view
// state is small and client-only, no separate search API route.
// Preset and user decks are merged into one browsable list rather than
// two separately-headed sections, since the topic filter and search
// need to run across both.
export function FlashcardsBrowser({
  presetDecks,
  userDecks,
  favoritedDeckIds,
  isSignedIn,
  isEditor,
}: {
  presetDecks: DeckSummary[];
  userDecks: DeckSummary[];
  favoritedDeckIds: Set<string>;
  isSignedIn: boolean;
  isEditor: boolean;
}) {
  const t = useTranslations("flashcards");
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allDecks = useMemo(() => [...presetDecks, ...userDecks], [presetDecks, userDecks]);

  // Only preset decks carry a region-derived topic label today (user
  // decks have no source disease to derive one from) — the filter
  // options are exactly the labels actually present, never invented.
  const topics = useMemo(() => {
    const labels = new Set(presetDecks.map((d) => d.topicLabel).filter((v): v is string => Boolean(v)));
    return [...labels].sort();
  }, [presetDecks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allDecks.filter((deck) => {
      if (topicFilter !== "all" && deck.topicLabel !== topicFilter) return false;
      if (!q) return true;
      return deck.name.toLowerCase().includes(q) || deck.description.toLowerCase().includes(q);
    });
  }, [allDecks, query, topicFilter]);

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
          {topics.length > 0 && (
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="rounded-full border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            >
              <option value="all">{t("allTopics")}</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          )}

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

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">
          {t("noDecksMatch")}
        </p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
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
