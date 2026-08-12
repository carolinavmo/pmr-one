import { pool } from "@/lib/db";
import type { CardColor } from "@/lib/editorial-blocks";

// Clinical Tools v1 — a generic, data-driven calculator engine (see
// db/migrations/0034_clinical_calculators.sql). Same "plain
// pool.query, no ORM" shape as study-planner.ts. Public content, no
// user_id scoping anywhere in this file — unlike study_task, a
// calculator isn't owned by anyone.

export interface CalculatorItemOption {
  value: number;
  label: string;
  description?: string;
}

export interface CalculatorItem {
  id: string;
  label: string;
  instructions?: string;
  options: CalculatorItemOption[];
  // Optional grouping label (e.g. "Motor domain") for scales that
  // organize items into subsections, like FIM's motor/cognitive split.
  // Consecutive items sharing the same section render under one
  // subsection heading with its own subtotal; Barthel has none, so it
  // renders as a single flat list.
  section?: string;
}

export interface CalculatorInterpretationBand {
  min: number;
  max: number;
  label: string;
  description?: string;
  severity?: "good" | "warning" | "serious" | "critical";
}

export type CalculatorScoring =
  | { method: "sum" }
  | { method: "formula"; formula: string };

export interface CalculatorSource {
  citation: string;
  url?: string;
}

export interface CalculatorDefinition {
  items: CalculatorItem[];
  scoring: CalculatorScoring;
  maxScore?: number;
  interpretation?: CalculatorInterpretationBand[];
  // Plain-language description of the scoring method, authored per
  // calculator (and per locale, like item/option text) rather than
  // derived from scoring.method — a formula-scored scale needs prose
  // no generic renderer could produce from the formula name alone.
  calculationExplanation?: string;
  // The citation text is carried unchanged across every locale's
  // translation row (scientific citations aren't translated); only
  // calculationExplanation actually varies per locale.
  source?: CalculatorSource;
}

export interface CalculatorCategory {
  id: string;
  slug: string;
  name: string;
  color: CardColor;
  position: number;
}

export interface CalculatorSummary {
  id: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  categoryColor: CardColor;
  name: string;
  abbreviation: string | null;
  description: string;
  population: string | null;
  itemCount: number;
  estimatedMinutesMin: number | null;
  estimatedMinutesMax: number | null;
}

export interface Calculator extends CalculatorSummary {
  definition: CalculatorDefinition;
}

function mapCategoryRow(r: {
  id: string;
  slug: string;
  name: string;
  color: string;
  position: number;
}): CalculatorCategory {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    color: r.color as CardColor,
    position: r.position,
  };
}

export async function getCalculatorCategories(): Promise<CalculatorCategory[]> {
  const { rows } = await pool.query(
    `SELECT id, slug, name, color, position
     FROM clinical_calculator_category
     ORDER BY position, name`
  );
  return rows.map(mapCategoryRow);
}

// English (`locale === "en"`) always reads the source columns directly.
// Any other locale LEFT JOINs the translation row for that locale and
// falls back to the source column when no translation exists yet —
// never blank, never a 404 for an untranslated calculator.
export async function getAllCalculators(locale: string): Promise<CalculatorSummary[]> {
  const { rows } = await pool.query(
    `SELECT
       c.id, c.slug,
       cat.slug AS category_slug, cat.name AS category_name, cat.color AS category_color,
       COALESCE(t.name, c.name) AS name,
       c.abbreviation,
       COALESCE(t.description, c.description) AS description,
       c.population, c.estimated_minutes_min, c.estimated_minutes_max,
       jsonb_array_length(COALESCE(t.definition, c.definition) -> 'items') AS item_count
     FROM clinical_calculator c
     JOIN clinical_calculator_category cat ON cat.id = c.category_id
     LEFT JOIN clinical_calculator_translation t
       ON t.calculator_id = c.id AND t.locale = $1
     WHERE c.status = 'published'
     ORDER BY cat.position, c.position, c.name`,
    [locale]
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    categorySlug: r.category_slug,
    categoryName: r.category_name,
    categoryColor: r.category_color as CardColor,
    name: r.name,
    abbreviation: r.abbreviation,
    description: r.description,
    population: r.population,
    itemCount: r.item_count,
    estimatedMinutesMin: r.estimated_minutes_min,
    estimatedMinutesMax: r.estimated_minutes_max,
  }));
}

export async function getCalculatorBySlug(
  slug: string,
  locale: string
): Promise<Calculator | null> {
  const { rows } = await pool.query(
    `SELECT
       c.id, c.slug,
       cat.slug AS category_slug, cat.name AS category_name, cat.color AS category_color,
       COALESCE(t.name, c.name) AS name,
       c.abbreviation,
       COALESCE(t.description, c.description) AS description,
       c.population, c.estimated_minutes_min, c.estimated_minutes_max,
       COALESCE(t.definition, c.definition) AS definition
     FROM clinical_calculator c
     JOIN clinical_calculator_category cat ON cat.id = c.category_id
     LEFT JOIN clinical_calculator_translation t
       ON t.calculator_id = c.id AND t.locale = $2
     WHERE c.slug = $1 AND c.status = 'published'`,
    [slug, locale]
  );
  const r = rows[0];
  if (!r) return null;
  const definition = r.definition as CalculatorDefinition;
  return {
    id: r.id,
    slug: r.slug,
    categorySlug: r.category_slug,
    categoryName: r.category_name,
    categoryColor: r.category_color as CardColor,
    name: r.name,
    abbreviation: r.abbreviation,
    description: r.description,
    population: r.population,
    itemCount: definition.items.length,
    estimatedMinutesMin: r.estimated_minutes_min,
    estimatedMinutesMax: r.estimated_minutes_max,
    definition,
  };
}
