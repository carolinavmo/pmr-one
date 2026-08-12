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
// answered item's raw option value, in item order.
const FORMULAS: Record<string, (values: number[]) => number> = {};

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
