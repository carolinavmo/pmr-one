-- ============================================================
-- PM&R Atlas — Migration 0007 — Risk Factor block type
-- Risk Factors is the first Knowledge Object type wired through the
-- new "+" command palette's reuse-first insert workflow
-- (AUTHORING_EXPERIENCE.md, "Adding a block"). risk_factor and
-- risk_factor_disease_relationship have existed since schema-v1.0;
-- editorial_block_type just never had a value for embedding one on a
-- page, the same gap 0004 closed for imaging_findings.
-- ============================================================

ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'risk_factor';
