-- i18n Phase B: source-locale tracking + translation storage.
-- See LESSONS_LEARNED.md #126/#127 for Phase 0/A (routing + UI chrome).
-- This migration adds no reader-visible behavior on its own — nothing
-- reads these columns/tables yet (that's Phase C) — it only lays the
-- schema down.

-- ============================================================
-- source_locale: one column per table that holds authored prose,
-- added per row (not a single site-wide setting) — Knowledge Graph
-- objects (risk factors, exam maneuvers, etc.) are shared and reused
-- across diseases and could have been authored in different languages
-- at different times.
--
-- Two-step ALTER is deliberate: existing rows all backfill to 'en'
-- (accurate — everything authored before this migration was English),
-- then the column's *default* flips to 'pt-pt' so every row created
-- from now on defaults to the founder's own going-forward authoring
-- locale, with no separate backfill step needed for future inserts.
-- ============================================================

ALTER TABLE disease ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE disease ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE editorial_block ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE editorial_block ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE topic ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE topic ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE anatomy_structure ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE anatomy_structure ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE examination_maneuver ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE examination_maneuver ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE treatment_algorithm ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE treatment_algorithm ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE treatment_algorithm_step ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE treatment_algorithm_step ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE procedure ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE procedure ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE clinical_pearl_editorial ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE clinical_pearl_editorial ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE medical_illustration ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE medical_illustration ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE risk_factor ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE risk_factor ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE imaging_finding ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE imaging_finding ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE imaging_finding_disease_relationship ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE imaging_finding_disease_relationship ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE rehabilitation_protocol ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE rehabilitation_protocol ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE exercise ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE exercise ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

ALTER TABLE dashboard_hero ADD COLUMN source_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE dashboard_hero ALTER COLUMN source_locale SET DEFAULT 'pt-pt';

-- ============================================================
-- content_translation: generic polymorphic sidecar for the ~25 flat
-- prose columns across the Knowledge Graph tables above (everything
-- that ISN'T an editorial_block's content_config JSONB, which gets
-- its own whole-blob table below).
--
-- Named entity_type/entity_id (not target_type/target_id, the naming
-- the existing pearl_attachment/illustration_usage polymorphic join
-- tables use) — those two are "which disease is this pearl attached
-- to" join rows; this is a many-different-source-tables sidecar keyed
-- by a single encoded string, a different enough shape to justify its
-- own naming. entity_id is TEXT rather than UUID specifically so it
-- can hold dashboard_hero's singleton key ('1') and
-- imaging_finding_disease_relationship's composite key
-- (encoded "<imaging_finding_id>:<disease_id>") uniformly — see
-- entityKey() in src/lib/i18n/entity-key.ts, the one place that
-- encoding is ever produced or parsed. Same "integrity enforced at
-- the application layer" tradeoff pearl_attachment/illustration_usage
-- already document — a polymorphic target can't hold a real FK.
-- ============================================================

CREATE TABLE content_translation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  locale TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'machine' CHECK (status IN ('machine', 'reviewed', 'needs_attention')),
  translated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  UNIQUE (entity_type, entity_id, field_name, locale)
);

CREATE INDEX content_translation_lookup_idx
  ON content_translation (entity_type, entity_id, locale);

-- ============================================================
-- editorial_block_translation: one full translated content_config
-- blob per (block, locale) — not per-leaf-field rows. content_config's
-- arrays (tabs[].columns[].items[], rich_table.rows[].cells[]) have
-- no stable identity across an author's edit, so a per-leaf-path key
-- would silently misattribute translated text to the wrong item after
-- a reorder. Storing the whole blob makes the read path a straight
-- swap — resolveBlock's switch (disease-loader.ts) reads the
-- translated cc.body/cc.steps/etc. exactly as it reads the source,
-- never learning translation exists at all. ON DELETE CASCADE from
-- editorial_block — a plain block DELETE would otherwise leave orphan
-- translation rows forever.
-- ============================================================

CREATE TABLE editorial_block_translation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES editorial_block(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  content_config JSONB NOT NULL,
  source_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'machine' CHECK (status IN ('machine', 'reviewed', 'needs_attention')),
  translated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  UNIQUE (block_id, locale)
);

-- ============================================================
-- translation_failure: not a queue — a *visibility* table. Background
-- translation (via next/server's after()) has no request/response to
-- report failure to; without this row, a DeepL error just vanishes
-- into a server log nobody reads. The future admin Translations UI
-- reads this; a "Retry" action drains it.
-- ============================================================

CREATE TABLE translation_failure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 1,
  last_error TEXT NOT NULL,
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, locale)
);
