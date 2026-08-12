import type { CalculatorDefinition, CalculatorInterpretationBand } from "@/lib/clinical-tools";

// Pure functions, no React, no DOM — same "framework-free, unit-
// testable" shape as annotation-anchor.ts. The two scoring methods
// cover every scale pattern actually observed on the reference sites
// this feature is modeled on: "sum" covers both a multi-category
// point-sum scale (Barthel, Berg) and a single-select ordinal scale
// (modified Rankin) — the latter is just "sum" with exactly one item,
// no separate method needed. "formula" covers a Likert-normalized
// scale (DASH, SPADI, ...) via the named registry below, none of
// which exist yet — Barthel only exercises the "sum" branch.

// Registered by slug (definition.scoring.formula) as each formula-
// scored calculator is authored. Each function receives every
// answered item's raw option value, in item order. Rounded to the
// nearest whole number by the formula itself (not by the caller) —
// these transforms produce fractional results (e.g. (avg-1)*25) that
// would otherwise carry floating-point noise into the UI, unlike
// every "sum"-scored calculator, which is always a clean integer.
const FORMULAS: Record<string, (values: number[]) => number> = {
  // DASH / QuickDASH: ((mean of all items) - 1) x 25, mapping the
  // 1-5 per-item scale to a 0-100 result. Both use the same formula —
  // only the item count differs (30 vs 11) — so the same function
  // covers whichever item set the calculator actually authors.
  dash: (values) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round((mean - 1) * 25);
  },
  // SPADI: pain items (first 5, each 0-10) and disability items
  // (remaining 8, each 0-10) are each normalized to 0-100 by their own
  // subscale maximum, then the two percentages are averaged.
  spadi: (values) => {
    const pain = values.slice(0, 5);
    const disability = values.slice(5, 13);
    const painScore = (pain.reduce((sum, value) => sum + value, 0) / 50) * 100;
    const disabilityScore = (disability.reduce((sum, value) => sum + value, 0) / 80) * 100;
    return Math.round((painScore + disabilityScore) / 2);
  },
  // PRWE: pain items (first 5, each 0-10) are summed directly (0-50);
  // function items (remaining 10, each 0-10) are summed then halved
  // (0-50), so both subscales carry equal weight in the 0-100 total.
  prwe: (values) => {
    const pain = values.slice(0, 5);
    const fn = values.slice(5, 15);
    const painScore = pain.reduce((sum, value) => sum + value, 0);
    const functionScore = fn.reduce((sum, value) => sum + value, 0) / 2;
    return Math.round(painScore + functionScore);
  },
  // Plain mean of every item's raw value, rounded to 2 decimals rather
  // than a whole number — unlike DASH/SPADI/PRWE's 0-100 results, this
  // stays on the same small 1-5 scale as the items themselves (e.g. the
  // Boston Carpal Tunnel Questionnaire's two subscales), where rounding
  // to an integer would collapse most of the scale's resolution.
  mean: (values) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round(mean * 100) / 100;
  },
  // KOOS's five subscales (Pain, Symptoms, ADL, Sport/Rec, QoL) each
  // score their own items 0 (no problems) to 4 (extreme problems), then
  // invert and normalize to 0-100 where 100 = no problems, matching the
  // instrument's own published convention (ascending-good, unlike the
  // raw 0-4 item scale it's built from). Each subscale is its own
  // calculator row (same "one calculator per subscale" split as the
  // Boston Carpal Tunnel Questionnaire), all reusing this one formula.
  koos: (values) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round(100 - (mean / 4) * 100);
  },
  // FAAM's two subscales (ADL, Sport) share this shape too: every item
  // 0 (unable) to 4 (no difficulty), normalized to a 0-100 percentage
  // of the maximum possible — already ascending-good since a higher
  // per-item value already means "less difficulty," unlike KOOS's
  // inverted scale above.
  percent4: (values) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round((mean / 4) * 100);
  },
  // Foot Function Index: every item is a 0-10 NRS (0 = no pain/
  // difficulty, 10 = worst), normalized to a 0-100 percentage —
  // descendingGood (unlike percent4/koos, a higher raw item value
  // already means worse here, so no inversion).
  percent10: (values) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round((mean / 10) * 100);
  },
  // Sunnybrook Facial Grading System: the one calculator whose items
  // aren't all the same shape — 3 fixed-order groups sliced by index
  // (same convention as spadi/prwe above), each on its own rubric:
  // Resting Symmetry (3 items, 0-1 each), Voluntary Movement (5 items,
  // 1-5 each), Synkinesis (5 items, 0-3 each). The official composite
  // formula: (Movement sum x 4) - (Resting sum x 5) - Synkinesis sum,
  // clamped to 0-100 (100 = normal facial function) since the raw
  // formula can theoretically dip slightly negative at the worst end.
  sunnybrook: (values) => {
    const resting = values.slice(0, 3).reduce((sum, value) => sum + value, 0);
    const movement = values.slice(3, 8).reduce((sum, value) => sum + value, 0);
    const synkinesis = values.slice(8, 13).reduce((sum, value) => sum + value, 0);
    const total = movement * 4 - resting * 5 - synkinesis;
    return Math.max(0, Math.min(100, Math.round(total)));
  },
};

// Returns null until every item has an answer — the caller uses that
// to gate showing a result at all, matching the reference site's own
// "select all fields to see the result" behavior.
export function scoreCalculator(
  definition: CalculatorDefinition,
  answers: Record<string, number>
): number | null {
  const values: number[] = [];
  for (const item of definition.items) {
    const value = answers[item.id];
    if (value === undefined) return null;
    values.push(value);
  }

  if (definition.scoring.method === "sum") {
    return values.reduce((total, value) => total + value, 0);
  }

  const formula = FORMULAS[definition.scoring.formula];
  if (!formula) {
    throw new Error(`Unknown calculator formula: ${definition.scoring.formula}`);
  }
  return formula(values);
}

export function resolveInterpretation(
  definition: CalculatorDefinition,
  score: number
): CalculatorInterpretationBand | null {
  if (!definition.interpretation) return null;
  return (
    definition.interpretation.find((band) => score >= band.min && score <= band.max) ?? null
  );
}
