-- ============================================================
-- PM&R Atlas — Migration 0066 — Flashcard topic subject
-- FLASHCARDS-SPEC.md "The dashboard — final order" § Browse the
-- library: topics are grouped by subject on the dashboard, a
-- coarser, fixed 4-way grouping distinct from the per-topic Candy
-- palette colour. Defaults every existing topic to 'other' rather
-- than leaving it nullable — the browse grid always needs a group to
-- put a topic in.
-- ============================================================

ALTER TABLE flashcard_category ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT 'other'
  CHECK (subject IN ('msk', 'neuro', 'basic', 'other'));
