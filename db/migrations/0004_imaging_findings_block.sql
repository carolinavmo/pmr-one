-- ============================================================
-- PM&R Atlas — Migration 0004 — Imaging Findings block type
-- Closes the gap found while fixing Plantar Fasciopathy's identified
-- content gaps (LESSONS_LEARNED.md #10): imaging_finding and
-- imaging_finding_disease_relationship have existed since schema-v1.0's
-- patch section, but no Editorial Block type could embed one on a
-- page. Same mechanical pattern as the earlier 'examination_workflow'
-- and 'suggests' additions — a real gap, small patch, not a new design.
-- ============================================================

ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'imaging_findings';
