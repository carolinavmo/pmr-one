"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, MousePointerClick, RotateCcw, Shuffle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { FlashcardCard } from "@/lib/flashcards";
import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_CARD } from "@/lib/card-colors";
import { MASTERY_BOX } from "@/lib/flashcard-scoring";
import { recordReviewAction, saveReviewPositionAction } from "@/lib/actions/flashcards";

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
  deckId,
  lastCardId,
  categoryColor,
}: {
  cards: FlashcardCard[];
  isSignedIn: boolean;
  deckId: string;
  lastCardId: string | null;
  categoryColor: CardColor | null;
}) {
  const t = useTranslations("flashcards");
  const cardColorClass = CARD_COLOR_CARD[categoryColor ?? "neutral"];
  const [order, setOrder] = useState(() => cards.map((c) => c.id));
  // "Continue" is a plain navigation back to this page (StartDeckButton)
  // — resume at the card flashcard_deck_position last recorded for this
  // user, falling back to 0 when there's no stored position (a fresh
  // deck, a signed-out visitor, or a pass that already finished).
  const [index, setIndex] = useState(() => {
    const savedIndex = lastCardId ? cards.findIndex((c) => c.id === lastCardId) : -1;
    return savedIndex === -1 ? 0 : savedIndex;
  });
  const [revealed, setRevealed] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // cardId -> knew, for THIS pass through `order` only — powers the
  // completion screen's stats and "Review weak cards" (Again/Hard ones
  // from this pass). Cleared on Start Over / Review Weak / a fresh pass.
  // Object.keys() preserves insertion order for these UUID (non
  // integer-like) string keys, which the completion screen relies on to
  // reconstruct the pass's card-by-card sequence for its chart.
  const [sessionRatings, setSessionRatings] = useState<Record<string, boolean>>({});
  // Real wall-clock timing for this pass, not a fabricated number — reset
  // alongside sessionRatings any time a fresh pass starts, frozen into
  // elapsedMs the moment the pass ends (goTo) so later re-renders of the
  // results screen don't keep counting.
  const [passStartedAt, setPassStartedAt] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);

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
    // passStartedAt deliberately isn't reset here — Date.now() is an
    // impure call React's rules forbid during render, and this resync
    // only fires on a rare concurrent edit mid-review (CardManager
    // changing the list while this pass is in progress), not on the
    // ordinary Start Over / Review Weak paths (both event handlers,
    // where resetting it is fine).
  }

  // Deck-level mastery, computed from the box each card already
  // carries — no new fetch, and null-safe for signed-out visitors
  // (every card.box is null then, so this naturally resolves to 0%
  // rather than a fake number).
  const masteredCount = cards.filter((c) => c.box !== null && c.box >= MASTERY_BOX).length;
  const completePct = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0;

  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const current = cardsById.get(order[index]);

  // Keep flashcard_deck_position in sync with whatever the member is
  // actually looking at, so "Continue" (StartDeckButton) reopens here
  // next time instead of always landing on card 1. Cleared (not just
  // left stale) once a pass reaches the completion screen — there's no
  // meaningful "stopped here" position for a finished pass, and card 1
  // is the right place for the next "Continue" to land.
  useEffect(() => {
    if (!isSignedIn) return;
    saveReviewPositionAction(deckId, showResults ? null : (current?.id ?? null));
  }, [isSignedIn, deckId, showResults, current?.id]);

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
      setElapsedMs(Date.now() - passStartedAt);
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
    setPassStartedAt(Date.now());
    setElapsedMs(0);
  }

  function handleReviewWeak() {
    const weakIds = order.filter((id) => sessionRatings[id] === false);
    setOrder(weakIds);
    setIndex(0);
    setRevealed(false);
    setShowResults(false);
    setSessionRatings({});
    setPassStartedAt(Date.now());
    setElapsedMs(0);
  }

  if (showResults) {
    const reviewedIds = Object.keys(sessionRatings);
    const ratings = reviewedIds.map((id) => sessionRatings[id]);
    return (
      <DeckResults ratings={ratings} elapsedMs={elapsedMs} onStartOver={handleStartOverSession} onReviewWeak={handleReviewWeak} />
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
            className={`absolute inset-0 flex flex-col gap-6 overflow-y-auto rounded-2xl border p-6 shadow-sm sm:p-8 ${cardColorClass}`}
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
              className="flex flex-1 flex-col items-center justify-center gap-12 text-center"
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
            className={`absolute inset-0 flex flex-col gap-6 overflow-y-auto rounded-2xl border p-6 shadow-sm sm:p-8 ${cardColorClass}`}
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

// Decorative confetti dots around the completion checkmark — purely
// visual, so aria-hidden and drawn from the app's existing card-color
// tokens rather than inventing new colors.
const CONFETTI_DOTS = [
  { top: "4%", left: "20%", size: "size-2", color: "bg-card-red/70" },
  { top: "0%", left: "42%", size: "size-1.5", color: "bg-card-yellow/70" },
  { top: "10%", left: "62%", size: "size-2", color: "bg-accent/60" },
  { top: "2%", left: "78%", size: "size-1.5", color: "bg-card-green/70" },
  { top: "22%", left: "8%", size: "size-1.5", color: "bg-card-orange/70" },
  { top: "24%", left: "90%", size: "size-2", color: "bg-trust/60" },
  { top: "36%", left: "2%", size: "size-1.5", color: "bg-card-yellow/70" },
  { top: "38%", left: "96%", size: "size-1.5", color: "bg-card-red/60" },
];

function scoreLabelKey(percent: number): "scoreExcellent" | "scoreGood" | "scoreFair" | "scoreNeedsPractice" {
  if (percent >= 85) return "scoreExcellent";
  if (percent >= 70) return "scoreGood";
  if (percent >= 50) return "scoreFair";
  return "scoreNeedsPractice";
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

// End-of-pass summary — mirrors Question Bank's DeckResults (same
// "Start Again" idiom: local-only reset, persisted mastery untouched).
// Every figure here (score, correct/incorrect, elapsed time, the chart)
// comes from this pass's own ratings and a real wall-clock timer — none
// of it is fabricated, matching this app's content-honesty convention.
// The reference redesign also showed a 7-day study streak; that's
// deliberately omitted since this app has no cross-session streak data
// to back it (only per-pass state), and inventing a streak would
// violate that same convention.
function DeckResults({
  ratings,
  elapsedMs,
  onStartOver,
  onReviewWeak,
}: {
  ratings: boolean[];
  elapsedMs: number;
  onStartOver: () => void;
  onReviewWeak: () => void;
}) {
  const t = useTranslations("flashcards");
  const total = ratings.length;
  const correct = ratings.filter(Boolean).length;
  const incorrect = total - correct;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const correctPct = percent;
  const incorrectPct = total > 0 ? 100 - percent : 0;
  const avgSeconds = total > 0 ? elapsedMs / 1000 / total : 0;

  const SIZE = 128;
  const RADIUS = 52;
  const STROKE = 12;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const filledLength = (percent / 100) * CIRCUMFERENCE;

  return (
    <div className="flex min-h-[28rem] flex-col items-center gap-6 rounded-2xl border border-border bg-surface-card p-6 text-center shadow-sm sm:min-h-[32rem] sm:p-8">
      <div className="relative flex h-24 w-full max-w-xs items-center justify-center" aria-hidden="true">
        {CONFETTI_DOTS.map((dot, i) => (
          <span
            key={i}
            className={`absolute rounded-full ${dot.size} ${dot.color}`}
            style={{ top: dot.top, left: dot.left }}
          />
        ))}
        <span className="flex size-14 items-center justify-center rounded-full border-2 border-trust text-trust">
          <Check className="size-7" aria-hidden="true" />
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-semibold text-primary">{t("deckCompleteTitle")}</h2>
        <p className="font-ui text-sm text-secondary">{t("deckCompleteSubtitle")}</p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-surface-raised p-4">
          <span className="font-ui text-xs font-medium text-secondary">{t("yourScore")}</span>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-20" role="img" aria-label={`${percent}%`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" className="stroke-border/40" strokeWidth={STROKE} />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              className="stroke-trust"
              strokeWidth={STROKE}
              strokeDasharray={`${filledLength} ${CIRCUMFERENCE - filledLength}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
            <text
              x={SIZE / 2}
              y={SIZE / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-primary font-heading text-[26px] font-semibold"
            >
              {percent}%
            </text>
          </svg>
          <span className="font-ui text-xs text-secondary tabular-nums">({correct}/{total})</span>
          <span className="font-ui text-xs font-medium text-trust">{t(scoreLabelKey(percent))}</span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border/40 bg-surface-raised p-4">
          <span className="font-ui text-xs font-medium text-secondary">{t("correctLabel")}</span>
          <span className="font-heading text-2xl font-semibold text-card-green tabular-nums">{correct}</span>
          <span className="font-ui text-xs text-secondary tabular-nums">{correctPct}%</span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border/40 bg-surface-raised p-4">
          <span className="font-ui text-xs font-medium text-secondary">{t("incorrectLabel")}</span>
          <span className="font-heading text-2xl font-semibold text-card-red tabular-nums">{incorrect}</span>
          <span className="font-ui text-xs text-secondary tabular-nums">{incorrectPct}%</span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border/40 bg-surface-raised p-4">
          <span className="font-ui text-xs font-medium text-secondary">{t("timeElapsed")}</span>
          <span className="font-heading text-2xl font-semibold text-primary tabular-nums">{formatElapsed(elapsedMs)}</span>
          <span className="font-ui text-xs text-secondary tabular-nums">
            {t("avgPerCard", { seconds: avgSeconds.toFixed(1) })}
          </span>
        </div>
      </div>

      {total >= 2 && <PerformanceChart ratings={ratings} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-full border border-border px-4 py-2 font-ui text-sm font-medium text-secondary transition-colors duration-base hover:bg-surface-sunken hover:text-primary"
        >
          {t("startOver")}
        </button>
        {incorrect > 0 && (
          <button
            type="button"
            onClick={onReviewWeak}
            className="rounded-full border border-border px-4 py-2 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-surface-sunken"
          >
            {t("reviewWeak", { count: incorrect })}
          </button>
        )}
        <Link
          href="/flashcards"
          className="rounded-full bg-trust px-4 py-2 font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-trust/90"
        >
          {t("back")}
        </Link>
      </div>
    </div>
  );
}

const CHART_VIEW_WIDTH = 600;
const CHART_VIEW_HEIGHT = 160;
const CHART_PAD_LEFT = 32;
const CHART_PAD_RIGHT = 8;
const CHART_PAD_TOP = 12;
const CHART_PAD_BOTTOM = 22;

// Cumulative accuracy after each card reviewed this pass — a hand-built
// SVG line chart following this codebase's existing AnalyticsLineChart
// pattern (no charting library for one chart), fixed to a 0-100% scale
// since the series is inherently a percentage. Single series needs no
// legend (the heading above already names it).
function PerformanceChart({ ratings }: { ratings: boolean[] }) {
  const t = useTranslations("flashcards");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = ratings.length;
  const points = ratings.map((_, i) => {
    const correctSoFar = ratings.slice(0, i + 1).filter(Boolean).length;
    return Math.round((correctSoFar / (i + 1)) * 100);
  });

  const plotWidth = CHART_VIEW_WIDTH - CHART_PAD_LEFT - CHART_PAD_RIGHT;
  const plotHeight = CHART_VIEW_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const xFor = (i: number) => CHART_PAD_LEFT + (n === 1 ? 0 : (i / (n - 1)) * plotWidth);
  const yFor = (value: number) => CHART_PAD_TOP + plotHeight - (value / 100) * plotHeight;

  const linePoints = points.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");
  const areaPoints = `${xFor(0)},${yFor(0)} ${linePoints} ${xFor(n - 1)},${yFor(0)}`;
  const gridFractions = [0, 0.25, 0.5, 0.75, 1];

  function handleMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fraction = (event.clientX - rect.left) / rect.width;
    const index = Math.round(fraction * (n - 1));
    setHoverIndex(Math.min(n - 1, Math.max(0, index)));
  }

  const tooltipAnchorsLeft = hoverIndex !== null && hoverIndex > n / 2;

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-border/40 bg-surface-raised p-4 text-left">
      <h3 className="font-ui text-sm font-medium text-primary">{t("performanceOverTime")}</h3>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_VIEW_WIDTH} ${CHART_VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          className="h-[140px] w-full"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
          role="img"
          aria-label={t("performanceOverTime")}
        >
          {gridFractions.map((f) => (
            <line
              key={f}
              x1={CHART_PAD_LEFT}
              x2={CHART_VIEW_WIDTH - CHART_PAD_RIGHT}
              y1={CHART_PAD_TOP + plotHeight * (1 - f)}
              y2={CHART_PAD_TOP + plotHeight * (1 - f)}
              className="stroke-border"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <text x={CHART_PAD_LEFT - 6} y={CHART_PAD_TOP + 4} textAnchor="end" className="fill-secondary font-ui text-[10px]">
            100%
          </text>
          <text
            x={CHART_PAD_LEFT - 6}
            y={CHART_PAD_TOP + plotHeight}
            textAnchor="end"
            className="fill-secondary font-ui text-[10px]"
          >
            0%
          </text>

          <polygon points={areaPoints} className="fill-trust/10" />
          <polyline
            points={linePoints}
            fill="none"
            className="stroke-trust"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {hoverIndex !== null && (
            <>
              <line
                x1={xFor(hoverIndex)}
                x2={xFor(hoverIndex)}
                y1={CHART_PAD_TOP}
                y2={CHART_PAD_TOP + plotHeight}
                className="stroke-secondary/40"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={xFor(hoverIndex)} cy={yFor(points[hoverIndex])} r={4} className="fill-trust stroke-surface" strokeWidth={2} />
            </>
          )}

          <text x={CHART_PAD_LEFT} y={CHART_VIEW_HEIGHT - 6} className="fill-secondary font-ui text-[10px]">
            {t("cardOf", { current: 1, total: n })}
          </text>
          <text
            x={CHART_VIEW_WIDTH - CHART_PAD_RIGHT}
            y={CHART_VIEW_HEIGHT - 6}
            textAnchor="end"
            className="fill-secondary font-ui text-[10px]"
          >
            {t("cardOf", { current: n, total: n })}
          </text>
        </svg>

        {hoverIndex !== null && (
          <div
            className={`pointer-events-none absolute top-0 flex flex-col gap-0.5 rounded-md border border-border bg-surface-card px-2.5 py-1.5 shadow-md ${
              tooltipAnchorsLeft ? "right-0" : "left-0"
            }`}
            style={
              tooltipAnchorsLeft
                ? { right: `${100 - (xFor(hoverIndex) / CHART_VIEW_WIDTH) * 100}%`, marginRight: 8 }
                : { left: `${(xFor(hoverIndex) / CHART_VIEW_WIDTH) * 100}%`, marginLeft: 8 }
            }
          >
            <span className="font-ui text-xs font-medium text-primary">{t("cardOf", { current: hoverIndex + 1, total: n })}</span>
            <span className="font-ui text-xs text-secondary">{points[hoverIndex]}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
