// SM-2, not invented — FLASHCARDS-IMPLEMENTATION.md: "Do not invent a
// scheduler. If none exists, implement SM-2 — it is short, well
// documented and predictable." A brand-new card goes through one short
// learning phase first (minute-scale steps, so "Again"/"Hard" can
// resurface it later in the *same* session — see the spec's own check
// "does it come back in the same session?"), then graduates into
// classic SM-2 (ease factor, interval x ease) once it's answered
// "good" or "easy". This mirrors how Anki layers SM-2 on top of a
// short learning phase — plain SM-2 alone has no sub-day step, but the
// spec's own button labels (Again "< 1 min", Hard "6 min") require one.
export type CardState = "new" | "learning" | "review";
export type Grade = "again" | "hard" | "good" | "easy";
export const GRADES: Grade[] = ["again", "hard", "good", "easy"];

export interface Sm2State {
  state: CardState;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export const NEW_CARD_STATE: Sm2State = { state: "new", easeFactor: 2.5, intervalDays: 0, repetitions: 0 };

const MIN_EASE_FACTOR = 1.3;
const AGAIN_LEARNING_MINUTES = 1;
const HARD_LEARNING_MINUTES = 6;
const RELEARNING_MINUTES = 10; // "Again" on an already-graduated (review) card
const GOOD_GRADUATE_DAYS = 1;
const EASY_GRADUATE_DAYS = 4;
const MINUTES_PER_DAY = 1440;

export interface Sm2Outcome {
  next: Sm2State;
  // Minutes until this card is next due — the single number both the
  // button-preview label and the actual due_at write are computed
  // from, so the buttons can never show something the scheduler
  // doesn't actually do.
  dueInMinutes: number;
}

// The one function both grading (apply the chosen button) and preview
// (render all four buttons' labels before the user picks) call —
// "each showing its own interval, taken from the scheduler — never
// hard-coded" (FLASHCARDS-IMPLEMENTATION.md).
export function applyGrade(current: Sm2State, grade: Grade): Sm2Outcome {
  if (current.state !== "review") {
    // New or (re)learning — short fixed steps, no ease-factor math yet.
    switch (grade) {
      case "again":
        return { next: { ...current, state: "learning", intervalDays: 0, repetitions: 0 }, dueInMinutes: AGAIN_LEARNING_MINUTES };
      case "hard":
        return { next: { ...current, state: "learning", intervalDays: 0, repetitions: 0 }, dueInMinutes: HARD_LEARNING_MINUTES };
      case "good":
        return {
          next: { state: "review", easeFactor: current.easeFactor, intervalDays: GOOD_GRADUATE_DAYS, repetitions: 1 },
          dueInMinutes: GOOD_GRADUATE_DAYS * MINUTES_PER_DAY,
        };
      case "easy":
        return {
          next: { state: "review", easeFactor: current.easeFactor, intervalDays: EASY_GRADUATE_DAYS, repetitions: 1 },
          dueInMinutes: EASY_GRADUATE_DAYS * MINUTES_PER_DAY,
        };
    }
  }

  // Graduated — full SM-2: ease factor moves by grade, interval grows
  // by the (now possibly adjusted) ease factor.
  switch (grade) {
    case "again": {
      const easeFactor = Math.max(MIN_EASE_FACTOR, current.easeFactor - 0.2);
      return { next: { state: "learning", easeFactor, intervalDays: 0, repetitions: 0 }, dueInMinutes: RELEARNING_MINUTES };
    }
    case "hard": {
      const easeFactor = Math.max(MIN_EASE_FACTOR, current.easeFactor - 0.15);
      const intervalDays = Math.max(1, current.intervalDays * 1.2);
      return {
        next: { state: "review", easeFactor, intervalDays, repetitions: current.repetitions + 1 },
        dueInMinutes: intervalDays * MINUTES_PER_DAY,
      };
    }
    case "good": {
      const intervalDays = Math.max(1, current.intervalDays * current.easeFactor);
      return {
        next: { state: "review", easeFactor: current.easeFactor, intervalDays, repetitions: current.repetitions + 1 },
        dueInMinutes: intervalDays * MINUTES_PER_DAY,
      };
    }
    case "easy": {
      const easeFactor = current.easeFactor + 0.15;
      const intervalDays = Math.max(1, current.intervalDays * current.easeFactor * 1.3);
      return {
        next: { state: "review", easeFactor, intervalDays, repetitions: current.repetitions + 1 },
        dueInMinutes: intervalDays * MINUTES_PER_DAY,
      };
    }
  }
}

// All four buttons' outcomes at once — what StudyCard renders before
// any grade is picked.
export function previewGrades(current: Sm2State): Record<Grade, Sm2Outcome> {
  return {
    again: applyGrade(current, "again"),
    hard: applyGrade(current, "hard"),
    good: applyGrade(current, "good"),
    easy: applyGrade(current, "easy"),
  };
}

// "Known" (FLASHCARDS-SPEC.md's progress-tile ring, and Pass 4's
// dashboard definition, reused verbatim so it means the same thing
// everywhere): a review-state card — i.e. graduated out of the
// learning phase at least once. Lowered from a 21-day-interval bar
// (requiring real time to pass before any card could count) after
// user feedback that finishing a deck should move the ring
// immediately, not days later. Every consumer reads this one
// constant, so the ring and the state bar can never disagree with
// each other regardless of where the bar sits.
export const KNOWN_INTERVAL_THRESHOLD_DAYS = 1;
export function isKnown(state: Sm2State): boolean {
  return state.state === "review" && state.intervalDays >= KNOWN_INTERVAL_THRESHOLD_DAYS;
}
