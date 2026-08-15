"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, MousePointerClick, RotateCcw, Shuffle } from "lucide-react";
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
}: {
  cards: FlashcardCard[];
  isSignedIn: boolean;
}) {
  const t = useTranslations("flashcards");
  const [order, setOrder] = useState(() => cards.map((c) => c.id));
  // "Continue" is a plain navigation back to this page (StartDeckButton),
  // so resuming has to be derived here from the same box data the
  // progress bar already reads — box is null exactly for cards this
  // user has never rated, so the first null-box card in deck order is
  // "where they left off." Signed-out visitors have box === null on
  // every card, so this naturally resolves to 0 for them too.
  const [index, setIndex] = useState(() => {
    const firstUnreviewed = cards.findIndex((c) => c.box === null);
    return firstUnreviewed === -1 ? 0 : firstUnreviewed;
  });
  const [revealed, setRevealed] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // cardId -> knew, for THIS pass through `order` only — powers the
  // completion screen's stats and "Review weak cards" (Again/Hard ones
  // from this pass). Cleared on Start Over / Review Weak / a fresh pass.
  const [sessionRatings, setSessionRatings] = useState<Record<string, boolean>>({});

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
    setShowResults(false);
    setSessionRatings({});
  }

  // Deck-level mastery, computed from the box each card already
  // carries — no new fetch, and null-safe for signed-out visitors
  // (every card.box is null then, so this naturally resolves to 0%
  // rather than a fake number).
  const masteredCount = cards.filter((c) => c.box !== null && c.box >= MASTERY_BOX).length;
  const completePct = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0;

  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const current = cardsById.get(order[index]);

  if (!current && !showResults) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center font-ui text-sm text-secondary">
        {t("emptyDeck")}
      </div>
    );
  }

  // No more wraparound: running past the last card (by rating it) ends
  // the pass and shows the completion screen instead of silently
  // looping back to card 1.
  function goTo(nextIndex: number) {
    if (nextIndex >= order.length) {
      setShowResults(true);
      return;
    }
    setIndex(nextIndex);
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
    if (current) {
      setSessionRatings((prev) => ({ ...prev, [current.id]: knew }));
    }
    goTo(index + 1);
  }

  // Local reset only — same "restart the view, leave persisted mastery
  // alone" idiom Question Bank's DeckResults "Start Again" uses.
  // Deliberately distinct from DeckCard's "Start over", which wipes
  // flashcard_progress in the DB before you even enter the reviewer.
  function handleStartOverSession() {
    setOrder(cards.map((c) => c.id));
    setIndex(0);
    setRevealed(false);
    setShowResults(false);
    setSessionRatings({});
  }

  function handleReviewWeak() {
    const weakIds = order.filter((id) => sessionRatings[id] === false);
    setOrder(weakIds);
    setIndex(0);
    setRevealed(false);
    setShowResults(false);
    setSessionRatings({});
  }

  if (showResults) {
    const reviewedIds = Object.keys(sessionRatings);
    const knowCount = reviewedIds.filter((id) => sessionRatings[id]).length;
    const weakCount = reviewedIds.length - knowCount;
    return (
      <DeckResults
        totalReviewed={reviewedIds.length}
        knowCount={knowCount}
        weakCount={weakCount}
        onStartOver={handleStartOverSession}
        onReviewWeak={handleReviewWeak}
      />
    );
  }

  if (!current) {
    return null;
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

      <div className="relative min-h-[28rem] sm:min-h-[32rem]" style={{ perspective: "1600px" }}>
        <div
          className="relative h-full w-full transition-transform duration-500 motion-reduce:transition-none"
          style={{
            transformStyle: "preserve-3d",
            WebkitTransformStyle: "preserve-3d",
            transform: revealed ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front face — question */}
          <div
            className="absolute inset-0 flex flex-col gap-6 overflow-y-auto rounded-2xl border border-border bg-surface-card p-6 shadow-sm sm:p-8"
            aria-hidden={revealed}
            inert={revealed}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              pointerEvents: revealed ? "none" : "auto",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-border/30 px-3 py-1 font-ui text-xs font-semibold tracking-wide text-secondary uppercase">
                {t("frontLabel")}
              </span>
              <span className="rounded-full bg-border/30 px-3 py-1 font-ui text-xs font-medium text-secondary tabular-nums">
                {t("cardOf", { current: index + 1, total: order.length })}
              </span>
            </div>

            <div
              className="flex flex-1 flex-col items-center justify-center gap-4 text-center"
              role="button"
              tabIndex={0}
              onClick={() => setRevealed(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setRevealed(true);
                }
              }}
            >
              <p className="font-reading text-xl font-semibold text-primary">{current.question}</p>
              <div className="flex flex-col items-center gap-2 text-secondary">
                <MousePointerClick className="size-5" aria-hidden="true" />
                <span className="font-ui text-sm">{t("clickToReveal")}</span>
              </div>
            </div>
          </div>

          {/* Back face — answer */}
          <div
            className="absolute inset-0 flex flex-col gap-6 overflow-y-auto rounded-2xl border border-border bg-surface-card p-6 shadow-sm sm:p-8"
            aria-hidden={!revealed}
            inert={!revealed}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              pointerEvents: revealed ? "auto" : "none",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-trust/10 px-3 py-1 font-ui text-xs font-semibold tracking-wide text-trust uppercase">
                {t("backLabel")}
              </span>
              <span className="rounded-full bg-border/30 px-3 py-1 font-ui text-xs font-medium text-secondary tabular-nums">
                {t("cardOf", { current: index + 1, total: order.length })}
              </span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <p className="font-reading text-xl font-normal text-primary">{current.answer}</p>
            </div>

            {isSignedIn ? (
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
            )}
          </div>
        </div>
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

// End-of-pass summary — mirrors Question Bank's DeckResults (same
// "Start Again" idiom: local-only reset, persisted mastery untouched).
// knowCount/weakCount come from this pass's own ratings, not from the
// deck's overall (across-sessions) mastery, so the percentage reflects
// "how did this pass go," not lifetime progress.
function DeckResults({
  totalReviewed,
  knowCount,
  weakCount,
  onStartOver,
  onReviewWeak,
}: {
  totalReviewed: number;
  knowCount: number;
  weakCount: number;
  onStartOver: () => void;
  onReviewWeak: () => void;
}) {
  const t = useTranslations("flashcards");
  const percent = totalReviewed > 0 ? Math.round((knowCount / totalReviewed) * 100) : 0;

  return (
    <div className="flex min-h-[28rem] flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-surface-card p-6 text-center shadow-sm sm:min-h-[32rem] sm:p-8">
      <span className="flex size-14 items-center justify-center rounded-full border-2 border-trust text-trust">
        <Check className="size-7" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-semibold text-primary">{t("deckCompleteTitle")}</h2>
        <p className="font-ui text-sm text-secondary">
          {t("deckCompleteScore", { known: knowCount, total: totalReviewed, percent })}
        </p>
      </div>
      <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-border/40">
        <div className="h-full rounded-full bg-trust transition-all duration-base" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-full bg-accent px-4 py-2 font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover"
        >
          {t("startOver")}
        </button>
        {weakCount > 0 && (
          <button
            type="button"
            onClick={onReviewWeak}
            className="rounded-full border border-card-red/30 bg-card-red/5 px-4 py-2 font-ui text-sm font-medium text-card-red transition-colors duration-base hover:bg-card-red/10"
          >
            {t("reviewWeak", { count: weakCount })}
          </button>
        )}
        <Link
          href="/flashcards"
          className="rounded-full border border-border px-4 py-2 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-surface-sunken"
        >
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
