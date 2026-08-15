"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, RotateCcw, Shuffle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { FlashcardCard } from "@/lib/flashcards";
import { MASTERY_BOX } from "@/lib/flashcard-scoring";
import { recordReviewAction } from "@/lib/actions/flashcards";

// Question always visible, tap/click reveals the answer — same
// click-to-reveal interaction SelfCheckBlockView/EvidenceBadge already
// use elsewhere in this app, reused rather than reinvented (and the
// deliberate "force recall before revealing" reasoning behind
// self_check in the first place — LESSONS_LEARNED #23 — carries over
// here, so the rating row only appears post-reveal rather than always
// visible). Rating is the one gated action (writes flashcard_progress);
// the reveal itself stays fully public, same as self_check on disease
// pages.
//
// Again/Hard/Good/Easy is a visual-only rating row over the existing
// binary Leitner outcome (see flashcard-scoring.ts's nextBox) — Again
// and Hard both record "didn't know it" (box resets), Good and Easy
// both record "knew it" (box advances). There's no real 4-level
// spaced-repetition algorithm behind this yet, so the four buttons are
// deliberately unlabeled beyond their name — no fabricated per-button
// interval text, since Again and Hard (and Good and Easy) behave
// identically today.
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

  // Deck-level mastery, computed from the box each card already
  // carries — no new fetch, and null-safe for signed-out visitors
  // (every card.box is null then, so this naturally resolves to 0%
  // rather than a fake number).
  const masteredCount = cards.filter((c) => c.box !== null && c.box >= MASTERY_BOX).length;
  const completePct = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0;

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

  return (
    <div className="flex flex-col gap-5">
      {isSignedIn && (
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-border/40">
            <div
              className="h-full rounded-full bg-accent transition-all duration-base"
              style={{ width: `${completePct}%` }}
            />
          </div>
          <span className="shrink-0 font-ui text-sm text-secondary tabular-nums">
            {t("percentComplete", { percent: completePct })}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              className="rounded-full bg-trust/10 px-3 py-1 font-ui text-xs font-semibold tracking-wide text-trust uppercase transition-colors duration-base hover:bg-trust/20"
            >
              {t("back")}
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className="rounded-full bg-border/30 px-3 py-1 font-ui text-xs font-semibold tracking-wide text-secondary uppercase transition-colors duration-base hover:bg-border/50"
            >
              {t("next")}
            </button>
          </div>
          <span className="rounded-full bg-border/30 px-3 py-1 font-ui text-xs font-medium text-secondary tabular-nums">
            {t("cardOf", { current: index + 1, total: order.length })}
          </span>
        </div>

        {revealed ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex flex-col items-center gap-1.5">
              <span className="flex size-10 items-center justify-center rounded-full border-2 border-trust text-trust">
                <Check className="size-5" aria-hidden="true" />
              </span>
              <span className="font-ui text-sm font-semibold text-trust">{t("answerLabel")}</span>
            </div>
            <p className="font-heading text-xl font-semibold text-primary">{current.answer}</p>
            {sourceDiseaseName && sourceDiseaseSlug && (
              <Link
                href={`/conditions/${sourceDiseaseSlug}`}
                className="font-ui text-xs text-secondary hover:text-accent"
              >
                {t("fromDisease", { name: sourceDiseaseName })}
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <p className="font-heading text-xl font-semibold text-primary">{current.question}</p>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 font-ui text-sm text-accent transition-colors duration-base hover:bg-border/40"
            >
              {t("showAnswer")}
            </button>
            {sourceDiseaseName && sourceDiseaseSlug && (
              <Link
                href={`/conditions/${sourceDiseaseSlug}`}
                className="font-ui text-xs text-secondary hover:text-accent"
              >
                {t("fromDisease", { name: sourceDiseaseName })}
              </Link>
            )}
          </div>
        )}

        {revealed &&
          (isSignedIn ? (
            <div className="grid grid-cols-4 gap-2 border-t border-border pt-5 sm:gap-3">
              <button
                type="button"
                onClick={() => handleReview(false)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-card-red/30 bg-card-red/5 py-3 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-card-red/10"
              >
                <RotateCcw className="size-4 text-card-red" aria-hidden="true" />
                {t("again")}
              </button>
              <button
                type="button"
                onClick={() => handleReview(false)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-card-orange/30 bg-card-orange/5 py-3 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-card-orange/10"
              >
                <RotateCcw className="size-4 text-card-orange" aria-hidden="true" />
                {t("hard")}
              </button>
              <button
                type="button"
                onClick={() => handleReview(true)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-card-yellow/30 bg-card-yellow/5 py-3 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-card-yellow/10"
              >
                <RotateCcw className="size-4 text-card-yellow" aria-hidden="true" />
                {t("good")}
              </button>
              <button
                type="button"
                onClick={() => handleReview(true)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-card-green/30 bg-card-green/5 py-3 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-card-green/10"
              >
                <Check className="size-4 text-card-green" aria-hidden="true" />
                {t("easy")}
              </button>
            </div>
          ) : (
            <div className="flex w-full flex-col items-center gap-1.5 border-t border-border pt-5 text-center">
              <p className="font-ui text-xs text-secondary">{t("signInToTrack")}</p>
              <Link href="/login" className="font-ui text-xs font-medium text-accent hover:underline">
                {t("signInLink")}
              </Link>
            </div>
          ))}
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
