-- ============================================================
-- PM&R Atlas — Migration 0017 — Exam Maneuver Gallery block
-- A small, illustrated set of signature exam findings — numbered
-- cards (illustration + condensed technique description + a
-- Diagnostic Value panel when verified sensitivity/specificity
-- exists) — distinct from the comprehensive examination_workflow
-- list block. Reuses the same examination_maneuver /
-- maneuver_disease_relationship Knowledge Graph; only the block's own
-- presentation (illustration, numbering, condensed layout) is new.
-- ============================================================

ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'exam_maneuver_gallery';
