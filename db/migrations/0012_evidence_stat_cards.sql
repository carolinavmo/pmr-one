-- ============================================================
-- PM&R Atlas — Migration 0012 — Evidence Summary + Stat Card blocks
-- Two owns-content block types from the founder's card-library
-- reference: a fixed 3-tier evidence-grade widget (Strong/Moderate/
-- Limited), and a flexible number-forward card (stat / metric /
-- linear progress / circular progress variants).
-- ============================================================

ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'evidence_summary';
ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'stat_card';
