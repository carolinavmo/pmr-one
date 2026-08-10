-- ============================================================
-- PM&R Atlas — Migration 0011 — Treatment Algorithm step icon
-- Enables the flowchart-style Treatment Algorithm read view: a
-- small author-picked icon per step, rendered in each box/diamond.
-- next_step_if_true/next_step_if_false already existed in schema
-- v1.0 (0001_schema_v1_0.sql) but were unused until this pass —
-- no migration needed for those, just wiring them through.
-- ============================================================

ALTER TABLE treatment_algorithm_step ADD COLUMN IF NOT EXISTS icon TEXT;
