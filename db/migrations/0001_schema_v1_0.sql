-- ============================================================
-- PM&R Atlas — Schema v1.0 — FROZEN (Phase 0 / MVP scope)
-- Supersedes schema-v0.1.sql. Validated against a full vertical
-- slice (Plantar Fasciopathy, see vertical-slice-plantar-
-- fasciopathy.md) and refined with: a formal relationship
-- taxonomy, typed maneuver-disease relationships (confirms /
-- assesses_contributing_factor / rules_out), Risk Factor as a
-- first-class object, and Procedure as a first-class object.
-- Frozen: domain modeling pauses here; next phase is the
-- rendering/UX layer, not further schema expansion.
-- ============================================================

-- Shared enum: Editorial Lifecycle (spec §7A)
CREATE TYPE editorial_status AS ENUM (
  'draft', 'scientific_review', 'visual_asset_production',
  'editorial_review', 'published', 'archived'
);

-- ---------- KNOWLEDGE OBJECTS (Editorial Graph, §2.1) ----------

CREATE TABLE disease (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',           -- deprecated names, ICD-10 codes
  status editorial_status NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  reviewed_by UUID,                      -- FK to editorial user, deferred
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Minimal stub — full Anatomy Structure model deferred (spec §11A)
CREATE TABLE anatomy_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE examination_maneuver (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  technique TEXT NOT NULL,
  positive_finding TEXT NOT NULL,
  anatomy_structure_id UUID REFERENCES anatomy_structure(id),
  -- NOTE: sensitivity/specificity intentionally NOT here — they live on
  -- maneuver_confirms_disease below (spec §2.5).
  status editorial_status NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE treatment_algorithm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  status editorial_status NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Procedure (referenced by treatment_algorithm_step below) ----------
CREATE TABLE procedure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  indication TEXT,
  technique TEXT,
  anatomy_structure_id UUID REFERENCES anatomy_structure(id),
  status editorial_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Simplified v1: ordered steps with an optional binary branch. NOT a full
-- decision-tree/expression engine — flagged in the domain model (§11A) as
-- a real design challenge; this is a deliberately minimal first pass.
CREATE TABLE treatment_algorithm_step (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm_id UUID NOT NULL REFERENCES treatment_algorithm(id),
  step_order INT NOT NULL,
  instruction TEXT NOT NULL,
  branch_condition TEXT,                 -- nullable, e.g. "no improvement at 6 weeks"
  procedure_id UUID REFERENCES procedure(id), -- nullable; set when the step IS a procedure
  next_step_if_true UUID REFERENCES treatment_algorithm_step(id),
  next_step_if_false UUID REFERENCES treatment_algorithm_step(id)
);

CREATE TABLE clinical_pearl_editorial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,
  attribution TEXT,
  evidence_level TEXT,                   -- deliberately lower-tier, spec §2.6
  status editorial_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authors TEXT,
  title TEXT NOT NULL,
  journal TEXT,
  publication_year INT,
  doi TEXT UNIQUE,
  pmid TEXT UNIQUE,
  evidence_type TEXT,                    -- RCT / meta-analysis / case series / expert opinion
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- NOTE: no full-text storage — citation metadata + link only (copyright
  -- boundary, spec §11A).
);

CREATE TABLE medical_illustration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  asset_url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  style TEXT,                            -- line_diagram / photographic / render
  status editorial_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- RELATIONSHIP TAXONOMY (spec §2.5, refined post-vertical-slice) ----------
-- A formal vocabulary of relationship types, replacing the earlier
-- single-purpose "confirms" table. Found necessary by the Plantar
-- Fasciopathy vertical slice: not every Exam Maneuver *confirms* the
-- Disease it's associated with (e.g. Silfverskiöld Test assesses a
-- contributing factor, not the diagnosis itself).
CREATE TYPE relationship_type AS ENUM (
  'confirms',                    -- exam maneuver → disease
  'assesses_contributing_factor',-- exam maneuver → disease
  'rules_out',                   -- exam maneuver → disease (differential)
  'increases_risk_of',           -- risk factor → disease
  'treats',                      -- treatment algorithm → disease
  'illustrates',                 -- illustration → any target
  'depicts',                     -- illustration → anatomy structure
  'cites',                       -- any source → reference
  'attached_to'                  -- clinical pearl → any target
);

-- Examination Maneuver ↔ Disease (confirms / assesses_contributing_factor / rules_out)
CREATE TABLE maneuver_disease_relationship (
  examination_maneuver_id UUID NOT NULL REFERENCES examination_maneuver(id),
  disease_id UUID NOT NULL REFERENCES disease(id),
  relationship_type relationship_type NOT NULL
    CHECK (relationship_type IN ('confirms','assesses_contributing_factor','rules_out')),
  sensitivity NUMERIC(4,3),              -- applies mainly to confirms/rules_out
  specificity NUMERIC(4,3),
  evidence_strength TEXT,
  confidence TEXT,
  reference_id UUID REFERENCES reference(id),
  PRIMARY KEY (examination_maneuver_id, disease_id, relationship_type)
);

-- Risk Factor (new first-class object) → increases_risk_of → Disease
CREATE TABLE risk_factor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  status editorial_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE risk_factor_disease_relationship (
  risk_factor_id UUID NOT NULL REFERENCES risk_factor(id),
  disease_id UUID NOT NULL REFERENCES disease(id),
  relationship_type relationship_type NOT NULL DEFAULT 'increases_risk_of'
    CHECK (relationship_type = 'increases_risk_of'),
  relative_risk NUMERIC(6,2),
  odds_ratio NUMERIC(6,2),
  evidence_strength TEXT,
  reference_id UUID REFERENCES reference(id),
  PRIMARY KEY (risk_factor_id, disease_id)
);

-- Treatment Algorithm → treats → Disease
CREATE TABLE algorithm_treats_disease (
  treatment_algorithm_id UUID NOT NULL REFERENCES treatment_algorithm(id),
  disease_id UUID NOT NULL REFERENCES disease(id),
  line_of_therapy TEXT,                  -- first_line / second_line / adjunct
  recommendation_strength TEXT,
  guideline_reference_id UUID REFERENCES reference(id),
  patient_subgroup TEXT,
  PRIMARY KEY (treatment_algorithm_id, disease_id)
);

-- ---------- POLYMORPHIC RELATIONSHIPS: A DELIBERATE, FLAGGED TRADE-OFF ----------
-- "attached_to", "cites", and "illustrates" each connect ONE object type to
-- MANY possible target types (a Clinical Pearl attaches to a Disease, a
-- Maneuver, an Algorithm...; a Reference is cited by nearly everything).
--
-- Two real options existed here:
--   (a) a dedicated join table per (source_type, target_type) pair — full
--       DB-level referential integrity, but the table count grows
--       combinatorially as the object catalog grows — works against the
--       "everything is reusable, everything can relate to everything"
--       principle that's core to this platform (spec §2).
--   (b) a polymorphic join table (target_type + target_id) — flexible, no
--       table explosion, but referential integrity for target_id must be
--       enforced in the application layer, not the database.
--
-- DECIDED: (b), confirmed. Integrity for target_id/source_id is an
-- application-layer responsibility, not a database constraint.

CREATE TABLE pearl_attachment (
  clinical_pearl_id UUID NOT NULL REFERENCES clinical_pearl_editorial(id),
  target_type TEXT NOT NULL,             -- 'disease' | 'examination_maneuver' | 'treatment_algorithm' | ...
  target_id UUID NOT NULL,               -- integrity enforced in application layer
  PRIMARY KEY (clinical_pearl_id, target_type, target_id)
);

CREATE TABLE citation (
  source_type TEXT NOT NULL,             -- 'disease' | 'treatment_algorithm' | 'clinical_pearl_editorial' | ...
  source_id UUID NOT NULL,
  reference_id UUID NOT NULL REFERENCES reference(id),
  PRIMARY KEY (source_type, source_id, reference_id)
);

CREATE TABLE illustration_usage (
  medical_illustration_id UUID NOT NULL REFERENCES medical_illustration(id),
  target_type TEXT NOT NULL,             -- 'disease' | 'examination_maneuver' | 'treatment_algorithm_step' | ...
  target_id UUID NOT NULL,
  PRIMARY KEY (medical_illustration_id, target_type, target_id)
);

CREATE TABLE illustration_depicts_anatomy (
  medical_illustration_id UUID NOT NULL REFERENCES medical_illustration(id),
  anatomy_structure_id UUID NOT NULL REFERENCES anatomy_structure(id),
  PRIMARY KEY (medical_illustration_id, anatomy_structure_id)
);

-- ============================================================
-- VALIDATION TEST: "Assemble everything for the Plantar
-- Fasciopathy Disease Page" — every join below is a single hop,
-- no missing structure. This is the test the domain model needs
-- to pass before we trust it.
-- ============================================================
--
-- 1. SELECT * FROM disease WHERE 'plantar fasciopathy' = ANY(aliases)
--    OR canonical_name = 'Plantar Fasciopathy';
--
-- 2. SELECT em.* , mcd.sensitivity, mcd.specificity
--    FROM examination_maneuver em
--    JOIN maneuver_confirms_disease mcd ON mcd.examination_maneuver_id = em.id
--    WHERE mcd.disease_id = :disease_id;
--
-- 3. SELECT ta.*, atd.line_of_therapy
--    FROM treatment_algorithm ta
--    JOIN algorithm_treats_disease atd ON atd.treatment_algorithm_id = ta.id
--    WHERE atd.disease_id = :disease_id;
--    -- then: SELECT * FROM treatment_algorithm_step WHERE algorithm_id = :algorithm_id ORDER BY step_order;
--
-- 4. SELECT cp.* FROM clinical_pearl_editorial cp
--    JOIN pearl_attachment pa ON pa.clinical_pearl_id = cp.id
--    WHERE pa.target_type = 'disease' AND pa.target_id = :disease_id;
--
-- 5. SELECT r.* FROM reference r
--    JOIN citation c ON c.reference_id = r.id
--    WHERE c.source_type = 'disease' AND c.source_id = :disease_id;
--
-- 6. SELECT mi.* FROM medical_illustration mi
--    JOIN illustration_usage iu ON iu.medical_illustration_id = mi.id
--    WHERE iu.target_type = 'disease' AND iu.target_id = :disease_id;
--
-- Result: every Disease Page component (§6 in scope) resolves in one join.
-- No missing tables, no dead ends. Passes the test.

-- ============================================================
-- PATCH — found during reference-page implementation (Plantar
-- Fasciopathy). Imaging, Rehab, and Exercise were named in the
-- confirmed Disease Page layout (spec §6A) but never added to
-- the schema. Same mechanical pattern as Risk Factor/Procedure
-- above — not a new design, just a gap closed before freezing.
-- ============================================================

ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'suggests'; -- imaging finding -> disease

CREATE TABLE imaging_finding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  modality TEXT NOT NULL,                -- ultrasound / radiograph / mri / ct
  description TEXT,
  status editorial_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE imaging_finding_disease_relationship (
  imaging_finding_id UUID NOT NULL REFERENCES imaging_finding(id),
  disease_id UUID NOT NULL REFERENCES disease(id),
  relationship_type relationship_type NOT NULL DEFAULT 'suggests'
    CHECK (relationship_type = 'suggests'),
  typical_use TEXT,                      -- e.g. "reserved for atypical presentation"
  reference_id UUID REFERENCES reference(id),
  PRIMARY KEY (imaging_finding_id, disease_id)
);

CREATE TABLE rehabilitation_protocol (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  status editorial_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exercise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  instructions TEXT,
  anatomy_structure_id UUID REFERENCES anatomy_structure(id),
  status editorial_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rehabilitation_protocol_exercise (
  rehabilitation_protocol_id UUID NOT NULL REFERENCES rehabilitation_protocol(id),
  exercise_id UUID NOT NULL REFERENCES exercise(id),
  step_order INT NOT NULL,
  PRIMARY KEY (rehabilitation_protocol_id, exercise_id)
);

CREATE TABLE rehabilitation_protocol_treats_disease (
  rehabilitation_protocol_id UUID NOT NULL REFERENCES rehabilitation_protocol(id),
  disease_id UUID NOT NULL REFERENCES disease(id),
  PRIMARY KEY (rehabilitation_protocol_id, disease_id)
);

-- ============================================================
-- ADDITIVE LAYER — Editorial Block System (does not modify the
-- frozen Knowledge Graph above; sits on top of it as composition).
-- A Disease's page is an ordered sequence of blocks. Object-
-- embedding blocks reference existing Knowledge Objects via the
-- same polymorphic pattern as pearl_attachment/citation/
-- illustration_usage. Pure-narrative blocks carry authored content.
-- ============================================================

CREATE TYPE editorial_block_type AS ENUM (
  'paragraph', 'section_heading', 'medical_illustration',
  'interactive_illustration', 'clinical_photograph', 'ultrasound_gallery',
  'mri_gallery', 'infographic', 'key_point', 'clinical_pearl',
  'warning_pitfall', 'summary_box', 'comparison_table', 'timeline',
  'treatment_algorithm', 'rehabilitation_progression', 'exercise_gallery',
  'procedure_video', 'interactive_anatomy', 'clinical_case',
  'board_question', 'evidence_summary', 'guideline_update',
  'reference_list', 'patient_handout'
);

CREATE TABLE editorial_block (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID NOT NULL REFERENCES disease(id), -- v1 scope: Disease Page only
  position INT NOT NULL,
  block_type editorial_block_type NOT NULL,
  -- Object-embedding blocks only (nullable — narrative blocks leave these null):
  referenced_object_type TEXT,
  referenced_object_id UUID,
  display_config JSONB DEFAULT '{}',      -- size, layout hints, gallery filters
  -- Pure-narrative blocks only (paragraph, key_point, warning_pitfall,
  -- summary_box, timeline, comparison_table):
  authored_content TEXT,
  status editorial_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (disease_id, position)
);

-- ============================================================
-- ADDITIVE LAYER — Editorial Templates (starting structure only,
-- copy semantics — no ongoing link to source diseases after
-- instantiation, deliberately, to stay genuinely non-restrictive).
-- ============================================================

CREATE TABLE editorial_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "Tendinopathy Template"
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE editorial_template_block (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES editorial_template(id),
  position INT NOT NULL,
  block_type editorial_block_type NOT NULL,
  default_display_config JSONB DEFAULT '{}',
  placeholder_note TEXT,                 -- editorial guidance, e.g. "reference
                                          -- the primary confirming maneuver here"
  UNIQUE (template_id, position)
);

-- Split config into presentation vs. content — different concerns even
-- within one block. display_config = purely visual (width, alignment,
-- animation). content_config = structured content variants specific to
-- the block type (summary, callout text, learning objective, caption).
ALTER TABLE editorial_block ADD COLUMN content_config JSONB DEFAULT '{}';

-- FOUND DURING IMPLEMENTATION PLANNING: the Physical Examination widget
-- built this session has no corresponding block_type — 'examination_workflow'
-- was never added to the enum. Same category as the earlier omissions
-- (Imaging/Rehab/Procedure) — a real gap, small mechanical fix.
ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'examination_workflow';
