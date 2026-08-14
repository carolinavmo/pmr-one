// Pure functions, no React, no DOM — same framework-free shape as
// calculator-scoring.ts. A simple Leitner box system, not full SM-2:
// the reviewer UI is a binary Know/Don't-know (see the reference
// mockup), so there's no per-card ease factor to tune — just "move up
// a box on a hit, reset to box 1 on a miss," each box mapping to a
// fixed review interval.

// Index = box (1-5). Box 0 is never used (a card starts at box 1).
const LEITNER_INTERVAL_DAYS = [0, 0, 1, 3, 7, 16, 35] as const;
const MAX_BOX = 5;
export const MASTERY_BOX = 5;

export function nextBox(currentBox: number, knew: boolean): number {
  if (!knew) return 1;
  return Math.min(currentBox + 1, MAX_BOX);
}

export function computeDueAt(box: number, from: Date = new Date()): string {
  const days = LEITNER_INTERVAL_DAYS[box] ?? LEITNER_INTERVAL_DAYS[MAX_BOX];
  const due = new Date(from);
  due.setDate(due.getDate() + days);
  return due.toISOString().slice(0, 10);
}

export function isMastered(box: number): boolean {
  return box >= MASTERY_BOX;
}
