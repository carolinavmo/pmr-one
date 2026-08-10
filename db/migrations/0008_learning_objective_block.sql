-- ============================================================
-- PM&R Atlas — Migration 0008 — Learning Objective block type
-- Learning Objective already exists as a field on paragraph callouts
-- (ParagraphBlock.learningObjective); this adds it as its own
-- insertable Text block via the "+" picker, same mechanical gap 0004
-- and 0007 closed for imaging_findings and risk_factor. warning_pitfall
-- and timeline already had enum values reserved ahead of time; this is
-- the one Text-group type that didn't.
-- ============================================================

ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'learning_objective';
