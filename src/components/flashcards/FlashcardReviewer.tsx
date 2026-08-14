"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, Shuffle, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { FlashcardCard } from "@/lib/flashcards";
import { recordReviewAction } from "@/lib/actions/flashcards";

// Question always visible, tap/click reveals the answer — same
// click-to-reveal interaction SelfCheckBlockView/EvidenceBadge already
// use elsewhere in this app, reused rather than reinvented (and the
// deliberate "force recall before revealing" reasoning behind
// self_check in the first place — LESSONS_LEARNED #23 — carries over
// here, so Know/Don't-know only appear post-reveal rather than always
// visible). Know/Don't-know is the one gated action (writes
// flashcard_progress); the reveal itself stays fully public, same as
// self_check on disease pages. The outer sunken panel behind the white
// card reuses the same two-tone surface pairing My Handbook's index
// panel already established (surface-sunken behind surface-card).
export function FlashcardReviewer({
  cards,
  isSignedIn,
  sourceDiseaseName,
  sourceDiseaseSlug,
}: {
  cards: FlashcardCard[];
  isSignedIn: boolean;
  sourceDiseaseName?: string | null;
  sourceDiseaseSlug?: string | null;
}) {
  const t = useTranslations("flashcards");
  const [order, setOrder] = useState(() => cards.map((c) => c.id));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // Resync whenever the card set itself changes (an add/edit/delete in
  // the sibling CardManager, which shares this list via DeckWorkspace)
  // — a plain useState initializer only runs on mount, so without this
  // a newly added card would stay invisible in the reviewer until a
  // full page reload. Adjusted during render (React's documented
  // pattern for resetting state on a prop change), same idiom
  // TaskFormDrawer.tsx and NewDeckDrawer.tsx already use.
  const cardIdsKey = cards.map((c) => c.id).join(",");
  const [prevCardIdsKey, setPrevCardIdsKey] = useState(cardIdsKey);
  if (cardIdsKey !== prevCardIdsKey) {
    setPrevCardIdsKey(cardIdsKey);
    setOrder(cards.map((c) => c.id));
    setIndex(0);
    setRevealed(false);
  }

  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const current = cardsById.get(order[index]);

  if (!current) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center font-ui text-sm text-secondary">
        {t("emptyDeck")}
      </div>
    );
  }

  function goTo(nextIndex: number) {
    setIndex((nextIndex + order.length) % order.length);
    setRevealed(false);
  }

  function handleShuffle() {
    const shuffled = [...order];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrder(shuffled);
    setIndex(0);
    setRevealed(false);
  }

  function handleReview(knew: boolean) {
    if (isSignedIn && current) {
      recordReviewAction(current.id, knew);
    }
    goTo(index + 1);
  }

  const progressPct = ((index + 1) / order.length) * 100;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface-sunken p-5 sm:p-6">
      <div className="flex flex-col items-center gap-1.5">
        <span className="font-ui text-xs text-secondary tabular-nums">
          {t("progressLabel", { current: index + 1, total: order.length })}
        </span>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-border/40">
          <div
            className="h-full rounded-full bg-accent transition-all duration-base"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label={t("previous")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-card text-secondary transition-colors duration-base hover:bg-border/40 sm:size-11"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>

        <div className="flex min-h-64 flex-1 flex-col items-center gap-4 rounded-2xl bg-surface-card p-6 text-center shadow-sm sm:p-8">
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <p className="font-heading text-xl font-semibold text-primary">{current.question}</p>
            {revealed ? (
              <p className="w-full border-t border-border pt-4 font-ui text-base text-secondary">
                {current.answer}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="inline-flex min-h-11 items-center rounded-full border border-border px-4 font-ui text-sm text-accent transition-colors duration-base hover:bg-border/40"
              >
                {t("showAnswer")}
              </button>
            )}
            {sourceDiseaseName && sourceDiseaseSlug && (
              <Link
                href={`/conditions/${sourceDiseaseSlug}`}
                className="font-ui text-xs text-secondary hover:text-accent"
              >
                {t("fromDisease", { name: sourceDiseaseName })}
              </Link>
            )}
          </div>

          {revealed &&
            (isSignedIn ? (
              <div className="-mx-6 flex w-[calc(100%+3rem)] divide-x divide-border border-t border-border sm:-mx-8 sm:w-[calc(100%+4rem)]">
                <button
                  type="button"
                  onClick={() => handleReview(false)}
                  className="flex flex-1 items-center justify-center gap-2 py-4 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-card-red/5"
                >
                  {t("dontKnow")}
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-card-red/40 text-card-red">
                    <X className="size-3" aria-hidden="true" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleReview(true)}
                  className="flex flex-1 items-center justify-center gap-2 py-4 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-card-green/5"
                >
                  {t("know")}
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-card-green/40 text-card-green">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex w-full flex-col items-center gap-1.5 border-t border-border pt-4">
                <p className="font-ui text-xs text-secondary">{t("signInToTrack")}</p>
                <Link href="/login" className="font-ui text-xs font-medium text-accent hover:underline">
                  {t("signInLink")}
                </Link>
              </div>
            ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label={t("next")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-card text-secondary transition-colors duration-base hover:bg-border/40 sm:size-11"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleShuffle}
        className="flex items-center justify-center gap-1.5 font-ui text-sm text-secondary hover:text-accent"
      >
        <Shuffle className="size-4" aria-hidden="true" />
        {t("shuffle")}
      </button>
    </div>
  );
}
