-- ============================================================
-- PM&R Atlas — Migration 0009 — Tabs block type
-- A phase/stage/option switcher (e.g. a rehab program's Phase 1-4) —
-- owns-content, no Knowledge Object underneath. Each tab holds a
-- small set of labeled checklists (`columns`), the same author-typed-
-- list shape Comparison Table already uses. Deliberately not a
-- generic "tabs hold arbitrary sub-blocks" container — that's a
-- different, much larger feature (nested block composition).
-- ============================================================

ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'tabs';
