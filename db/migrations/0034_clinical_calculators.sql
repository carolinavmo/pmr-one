-- ============================================================
-- PM&R Atlas — Migration 0034 — Clinical Tools v1 (calculator engine)
-- A new, fully public top-level section: clinical assessment scales
-- (Barthel Index, Berg Balance Scale, DASH, ...) rendered by one
-- generic, data-driven engine rather than one hand-built page per
-- scale. Only the Barthel Index ships with this migration; the schema
-- is sized for the ~35-40 scales that follow in later rounds.
-- ============================================================

CREATE TABLE clinical_calculator_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,           -- English source name
  color TEXT NOT NULL,          -- a CardColor value (card-colors.ts) — no FK, same TEXT-not-enum tradeoff study_task.category already uses
  position INT NOT NULL DEFAULT 0
);

CREATE TABLE clinical_calculator (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  category_id UUID NOT NULL REFERENCES clinical_calculator_category(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                 -- English source name, e.g. "Barthel Index"
  abbreviation TEXT,                  -- e.g. "BI"
  description TEXT NOT NULL,          -- one-line English source description
  population TEXT,                    -- e.g. "Adults and older adults"
  estimated_minutes_min INT,
  estimated_minutes_max INT,

  -- English source definition — items/options/scoring/interpretation.
  -- See src/lib/clinical-tools.ts for the CalculatorDefinition shape
  -- this must conform to.
  definition JSONB NOT NULL,

  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX clinical_calculator_category_id_idx ON clinical_calculator (category_id);

-- One row per non-English locale actually translated. English always
-- reads straight off clinical_calculator itself (source_locale, same
-- shape as this app's other translated-content tables —
-- content_translation, editorial_block_translation). A calculator
-- with no row yet for a given locale falls back to the English source
-- rather than erroring or showing blank text — resolved at the
-- application layer in src/lib/clinical-tools.ts.
CREATE TABLE clinical_calculator_translation (
  calculator_id UUID NOT NULL REFERENCES clinical_calculator(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  definition JSONB NOT NULL,          -- same shape as the source; item/option ids unchanged, only label/description text translated
  PRIMARY KEY (calculator_id, locale)
);
