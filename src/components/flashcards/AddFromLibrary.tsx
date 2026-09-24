"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { LibraryTopic } from "@/lib/flashcards";
import { addLibraryTopicAction, undoAddLibraryTopicAction } from "@/lib/actions/flashcards";

interface Snackbar {
  categoryId: string;
  libraryTopicId: string;
  name: string;
  cardCount: number;
}

const SNACKBAR_MS = 10_000;

// "Topics from the library" (FLASHCARDS-ADD-TOPIC-IMPLEMENTATION.md) —
// a deck-of-cards stack per system topic, not yet copied into the
// user's own account. Owns the optimistic add/undo flow itself since
// nothing else on the dashboard needs it.
export function AddFromLibrary({ topics, isSignedIn }: { topics: LibraryTopic[]; isSignedIn: boolean }) {
  const t = useTranslations("flashcards");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<Snackbar | null>(null);
  const [undone, setUndone] = useState(false);

  const totalCards = topics.reduce((sum, topic) => sum + topic.cardCount, 0);

  async function handleAdd(topic: LibraryTopic) {
    setAddingId(topic.id);
    const result = await addLibraryTopicAction(topic.id);
    setAddingId(null);
    if (!result) return; // failure — button reverts to "Add topic" on its own (addingId cleared, addedIds untouched)
    setAddedIds((prev) => new Set(prev).add(topic.id));
    setUndone(false);
    setSnackbar({ categoryId: result.category.id, libraryTopicId: topic.id, name: result.category.name, cardCount: result.cardCount });
    window.setTimeout(() => {
      setSnackbar((current) => (current?.categoryId === result.category.id ? null : current));
    }, SNACKBAR_MS);
  }

  async function handleUndo() {
    if (!snackbar) return;
    const { categoryId, libraryTopicId } = snackbar;
    setSnackbar(null);
    setUndone(true);
    setAddedIds((prev) => {
      const next = new Set(prev);
      next.delete(libraryTopicId);
      return next;
    });
    await undoAddLibraryTopicAction(categoryId);
  }

  if (topics.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2.5">
        <h2 className="font-heading text-lg font-black text-navy">{t("addFromLibrary")}</h2>
        <span className="font-ui text-xs font-bold text-secondary">{t("addFromLibrarySubtitle", { cards: totalCards, count: topics.length })}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 pt-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {topics.map((topic) => (
          <LibraryTopicCard
            key={topic.id}
            topic={topic}
            isSignedIn={isSignedIn}
            isAdded={topic.isAdded || addedIds.has(topic.id)}
            isAdding={addingId === topic.id}
            onAdd={() => handleAdd(topic)}
          />
        ))}
      </div>

      <p className="font-ui text-xs font-bold text-secondary">{t("addTopicHint")}</p>

      {snackbar && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-xl bg-navy px-5 py-3.5 shadow-lg"
        >
          <span className="font-ui text-sm font-bold text-white">{t("topicAddedSnackbar", { name: snackbar.name, cards: snackbar.cardCount })}</span>
          <Link href={`/flashcards/study?topic=${snackbar.categoryId}`} className="font-ui text-sm font-black text-acc-dk hover:underline">
            {t("studyNow")}
          </Link>
          <button type="button" onClick={handleUndo} className="font-ui text-sm font-black text-white/70 hover:text-white">
            {t("undo")}
          </button>
        </div>
      )}
      {undone && (
        <span className="sr-only" role="status" aria-live="polite">
          {t("topicAddUndone")}
        </span>
      )}
    </div>
  );
}

function LibraryTopicCard({
  topic,
  isSignedIn,
  isAdded,
  isAdding,
  onAdd,
}: {
  topic: LibraryTopic;
  isSignedIn: boolean;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: () => void;
}) {
  const t = useTranslations("flashcards");
  const isComingSoon = topic.deckCount === 0;
  const buttonLabel = t("addTopicButtonLabel", { name: topic.name, decks: topic.deckCount, cards: topic.cardCount });

  return (
    <article
      aria-labelledby={`library-topic-${topic.id}`}
      data-topic-color={topic.topicColor ?? undefined}
      className={`relative pt-2.5 transition-opacity duration-base ${isAdded ? "opacity-70" : ""}`}
    >
      {/* Decorative stack behind the card — purely visual, so both
          layers are pointer-events-none and aria-hidden; clicking them
          must do nothing. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-0 h-[30px] rounded-2xl border-2 border-[var(--topic-bd)] bg-white opacity-60" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-1.5 top-[5px] h-[30px] rounded-2xl border-2 border-[var(--topic-bd)] bg-white opacity-85" />

      <div className="relative rounded-2xl border-2 p-4" style={{ borderColor: "var(--topic-bd)", backgroundColor: "var(--topic-bg)" }}>
        {!isComingSoon && (
          <span className="absolute -top-2.5 right-3 rounded-full px-2.5 py-1 font-ui text-[11px] font-black text-white" style={{ backgroundColor: "var(--topic)" }}>
            {t("cardCount", { count: topic.cardCount })}
          </span>
        )}

        <h3 id={`library-topic-${topic.id}`} className="font-heading text-base font-black text-navy">
          {topic.name}
        </h3>
        <p className="mt-1 font-ui text-xs font-bold text-secondary">
          {isComingSoon ? t("comingSoon") : t("deckCount", { count: topic.deckCount })}
        </p>
        {!isComingSoon && (
          <p className="mt-2 line-clamp-2 min-h-[32px] font-ui text-xs font-semibold text-secondary">{topic.sampleDeckTitles.join(" · ")}</p>
        )}

        {!isComingSoon &&
          (isSignedIn ? (
            <button
              type="button"
              onClick={onAdd}
              disabled={isAdded || isAdding}
              aria-label={isAdded ? undefined : buttonLabel}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border-[1.5px] py-2 font-ui text-sm font-black disabled:cursor-default"
              style={
                isAdded
                  ? { backgroundColor: "var(--topic)", borderColor: "var(--topic)", color: "white" }
                  : { backgroundColor: "white", borderColor: "var(--topic)", color: "var(--topic)" }
              }
            >
              {isAdding ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  {t("addingTopic")}
                </>
              ) : isAdded ? (
                t("addedTopic")
              ) : (
                t("addTopicButton")
              )}
            </button>
          ) : (
            <Link
              href="/login"
              className="mt-3 flex w-full items-center justify-center rounded-lg border-[1.5px] py-2 font-ui text-sm font-black"
              style={{ backgroundColor: "white", borderColor: "var(--topic)", color: "var(--topic)" }}
            >
              {t("signInLink")}
            </Link>
          ))}
      </div>
    </article>
  );
}
