import type { Grade, Sm2State } from "./flashcard-sm2";

// FLASHCARDS-IMPLEMENTATION.md Pass 5: "queue grades locally and
// sync; the session must survive a dropped connection." The grading
// UI (StudySession.tsx) already advances optimistically off the
// client-computed applyGrade() outcome — the exact same pure function
// recordSm2Review() calls server-side on the same (current, grade)
// input, so the two are guaranteed to agree. That leaves
// recordSm2ReviewAction() as a pure persistence side-effect: this
// module is where a failed call goes to wait for the next 'online'
// event instead of losing the grade. localStorage (not memory) so a
// network drop followed by a tab reload — not just a live
// reconnect — still has something to flush.
const QUEUE_KEY = "pmr-atlas:flashcards-pending-reviews";

export interface QueuedReview {
  flashcardId: string;
  deckId: string;
  current: Sm2State;
  grade: Grade;
  queuedAt: number;
}

export function loadReviewQueue(): QueuedReview[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReviewQueue(items: QueuedReview[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // Private window, blocked storage, or quota — the review already
    // landed in this session's own state; losing the retry queue only
    // means it won't survive a reload while still offline.
  }
}

export function enqueueReview(item: QueuedReview): QueuedReview[] {
  const next = [...loadReviewQueue(), item];
  saveReviewQueue(next);
  return next;
}

// Removes the oldest N entries (the ones just flushed) rather than
// clearing the whole queue — a new grade can queue up while a flush
// for earlier ones is still in flight.
export function removeFlushedReviews(count: number): QueuedReview[] {
  const next = loadReviewQueue().slice(count);
  saveReviewQueue(next);
  return next;
}
