"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, CloudOff } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { StudyCard } from "@/lib/flashcards";
import type { Grade, Sm2State } from "@/lib/flashcard-sm2";
import { applyGrade, previewGrades } from "@/lib/flashcard-sm2";
import { recordSm2ReviewAction, getUserStreakAction, getTopicKnownPercentAction } from "@/lib/actions/flashcards";
import { loadReviewQueue, enqueueReview, removeFlushedReviews } from "@/lib/flashcard-review-queue";
import { StudyCardView } from "./StudyCardView";
import { SessionCompleteView } from "./SessionCompleteView";

// A short-interval grade (still "new"/"learning" after grading, or a
// lapse back into relearning) gets reinserted this many cards ahead
// rather than literally waiting on its real due_at — the spec's own
// check is "does it come back in the same session?", not "does it
// wait the literal number of minutes," and Anki's own learning queue
// works the same way (position-based, not wall-clock, within a
// session).
const REQUEUE_OFFSET = 3;
const SECONDS_PER_CARD = 6;

export interface SessionLogEntry {
  cardId: string;
  grade: Grade;
}

export function StudySession({ initialCards, backHref }: { initialCards: StudyCard[]; backHref: string }) {
  const t = useTranslations("flashcards");
  const router = useRouter();

  const [queue, setQueue] = useState<StudyCard[]>(initialCards);
  const [cardStates, setCardStates] = useState<Record<string, Sm2State>>(() =>
    Object.fromEntries(initialCards.map((c) => [c.id, c.sm2]))
  );
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grading, setGrading] = useState(false);
  const [log, setLog] = useState<SessionLogEntry[]>([]);
  const sessionStartedAt = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [knownBefore, setKnownBefore] = useState<number | null>(null);
  const [knownAfter, setKnownAfter] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const current = index < queue.length ? queue[index] : null;
  const currentState = current ? (cardStates[current.id] ?? current.sm2) : null;
  const done = index >= queue.length;

  // Topic percent-known before/after (Session complete's "now 62%
  // known — up 4 points") — only meaningful when every card in the
  // session shares one topic (a single-deck session whose deck has a
  // category, or a topic session by definition covers just one).
  // Derived from the *original* queue, not the live one (which grows
  // as cards requeue) — the set of topics involved never changes
  // mid-session.
  const sharedCategoryId = useMemo(() => {
    const ids = new Set(initialCards.map((c) => c.categoryId).filter((id): id is string => id !== null));
    return ids.size === 1 ? [...ids][0] : null;
    // initialCards is a prop, stable for the component's lifetime —
    // deliberately not `queue` (which mutates via requeueing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sessionStartedAt.current = Date.now();
    (async () => {
      const known = sharedCategoryId ? await getTopicKnownPercentAction(sharedCategoryId) : null;
      setKnownBefore(known);
    })();
    // Only runs once per mount — session-level baseline, not per-card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FLASHCARDS-IMPLEMENTATION.md Pass 5: "queue grades locally and
  // sync; the session must survive a dropped connection." Flushes
  // whatever flashcard-review-queue.ts has on mount (a previous tab
  // session may have dropped offline and never got to retry) and
  // again on every 'online' event. A flush stops at the first failure
  // rather than skipping ahead — that failure almost always means
  // still-offline, and preserves per-card order for the next attempt.
  const flushReviewQueue = useCallback(async () => {
    const items = loadReviewQueue();
    if (items.length === 0) return;
    let flushed = 0;
    for (const item of items) {
      try {
        await recordSm2ReviewAction(item.flashcardId, item.deckId, item.current, item.grade);
        flushed++;
      } catch {
        break;
      }
    }
    setPendingSyncCount(flushed > 0 ? removeFlushedReviews(flushed).length : items.length);
  }, []);

  useEffect(() => {
    // pendingSyncCount starts at 0 (its useState default); flushReviewQueue
    // sets the real count once the queue is read, so no separate initial
    // read is needed here.
    void (async () => {
      await flushReviewQueue();
    })();
    window.addEventListener("online", flushReviewQueue);
    return () => window.removeEventListener("online", flushReviewQueue);
  }, [flushReviewQueue]);

  // Advances the queue off the *client-computed* outcome, not the
  // server's response — applyGrade() is the exact same pure function
  // recordSm2Review() calls server-side on this same (current, grade)
  // pair, so the two are guaranteed to agree, and the session no
  // longer has to wait on a round trip to keep going. The network
  // call itself becomes a fire-and-forget persistence side-effect: on
  // failure (offline, or a dropped connection mid-request) the grade
  // is queued in flashcard-review-queue.ts rather than lost, and
  // retried on the next 'online' event or tab open.
  const handleGrade = useCallback(
    (grade: Grade) => {
      if (!current || !currentState || grading) return;
      setGrading(true);
      const outcome = applyGrade(currentState, grade);
      setLog((prev) => [...prev, { cardId: current.id, grade }]);
      setCardStates((prev) => ({ ...prev, [current.id]: outcome.next }));

      if (outcome.next.state !== "review") {
        // Still short-interval — requeue into this same session
        // instead of ending the card's turn for the day.
        setQueue((prev) => {
          const next = [...prev];
          const insertAt = Math.min(next.length, index + 1 + REQUEUE_OFFSET);
          next.splice(insertAt, 0, current);
          return next;
        });
      }
      setIndex((i) => i + 1);
      setFlipped(false);
      setGrading(false);

      void recordSm2ReviewAction(current.id, current.deckId, currentState, grade).catch(() => {
        setPendingSyncCount(
          enqueueReview({ flashcardId: current.id, deckId: current.deckId, current: currentState, grade, queuedAt: Date.now() }).length
        );
      });
    },
    [current, currentState, grading, index]
  );

  // Keyboard: space reveals then grades Good; 1-4 grade directly; Esc
  // exits. E/S (edit/star) deliberately not bound — no per-card
  // favourite/flag/edit affordance exists yet, see the Pass 2 report.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (done || grading) return;
      if (e.key === "Escape") {
        router.push(backHref);
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        if (!flipped) setFlipped(true);
        else void handleGrade("good");
        return;
      }
      if (!flipped) return;
      if (e.key === "1") void handleGrade("again");
      else if (e.key === "2") void handleGrade("hard");
      else if (e.key === "3") void handleGrade("good");
      else if (e.key === "4") void handleGrade("easy");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flipped, done, grading, handleGrade, router, backHref]);

  // Remaining-by-state chrome counts — the not-yet-shown slice of the
  // queue, each card's *current* tracked state (a requeued card may
  // have moved from "new" to "learning" since it first appeared).
  const remaining = queue.slice(index);
  const remainingCounts = {
    new: remaining.filter((c) => (cardStates[c.id] ?? c.sm2).state === "new").length,
    learning: remaining.filter((c) => (cardStates[c.id] ?? c.sm2).state === "learning").length,
    review: remaining.filter((c) => (cardStates[c.id] ?? c.sm2).state === "review").length,
  };

  useEffect(() => {
    if (!done) return;
    setElapsedMs(sessionStartedAt.current !== null ? Date.now() - sessionStartedAt.current : 0);
    if (streak === null) {
      // Fetched here, not at session start — every grade in this
      // session has already been written to flashcard_review_log by
      // the time the queue empties, so this reflects the streak
      // *including* today's just-finished session, not the state
      // before it (a streak of "0" on the completion screen would be
      // wrong the moment you finish your first session of the day).
      const todayYmd = new Intl.DateTimeFormat("en-CA").format(new Date());
      void getUserStreakAction(todayYmd).then(setStreak);
    }
    if (!sharedCategoryId || knownAfter !== null) return;
    (async () => {
      const known = await getTopicKnownPercentAction(sharedCategoryId);
      setKnownAfter(known);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (queue.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-sunken p-6">
        <p className="font-ui text-lg font-bold text-primary">{t("studyNothingDue")}</p>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="rounded-lg bg-accent px-4 py-2 font-ui text-sm font-bold text-white"
        >
          {t("studyBackToDeck")}
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <SessionCompleteView
        log={log}
        elapsedMs={elapsedMs}
        streak={streak}
        knownBefore={knownBefore}
        knownAfter={knownAfter}
        backHref={backHref}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-sunken">
      <div className="flex items-center justify-between px-4 py-3 sm:px-8">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          aria-label={t("studyClose")}
          className="flex size-[34px] items-center justify-center rounded-full border border-border bg-surface text-secondary hover:text-primary"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2">
          {current && (
            <span
              data-topic-color={current.topicColor ?? undefined}
              className="size-3 shrink-0 rounded-[3px]"
              style={{ backgroundColor: current.topicColor ? "var(--topic)" : "var(--color-border)" }}
              aria-hidden="true"
            />
          )}
          <div className="flex flex-col leading-tight">
            <span className="font-ui text-[14.5px] font-black text-primary">{current?.deckName}</span>
            {current?.topicName && <span className="font-ui text-[11px] text-secondary">{current.topicName}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pendingSyncCount > 0 && (
            <span className="flex items-center gap-1 font-ui text-[11px] font-bold text-secondary" role="status" aria-live="polite">
              <CloudOff className="size-3.5" aria-hidden="true" />
              {t("studyPendingSync", { count: pendingSyncCount })}
            </span>
          )}
          <div className="flex items-center gap-3 font-ui text-xs font-bold">
            <span style={{ color: "#E8564B" }}>{remainingCounts.new}</span>
            <span style={{ color: current?.topicColor ? "var(--topic)" : "#0E9BA6" }} data-topic-color={current?.topicColor ?? undefined}>
              {remainingCounts.learning}
            </span>
            <span style={{ color: "#4FBF86" }}>{remainingCounts.review}</span>
          </div>
        </div>
      </div>

      <div
        className="h-[5px] w-full bg-border"
        role="progressbar"
        aria-valuenow={index}
        aria-valuemin={0}
        aria-valuemax={queue.length}
      >
        <div
          className="h-full transition-all duration-base"
          style={{
            width: `${(index / queue.length) * 100}%`,
            backgroundColor: current?.topicColor ? "var(--topic)" : "var(--color-accent)",
          }}
          data-topic-color={current?.topicColor ?? undefined}
        />
      </div>

      {current && currentState && (
        <StudyCardView
          card={current}
          state={currentState}
          flipped={flipped}
          onFlip={() => setFlipped(true)}
          onGrade={handleGrade}
          grading={grading}
          position={index + 1}
          total={queue.length}
          minutesLeft={Math.ceil((remaining.length * SECONDS_PER_CARD) / 60)}
          previews={previewGrades(currentState)}
        />
      )}
    </div>
  );
}
