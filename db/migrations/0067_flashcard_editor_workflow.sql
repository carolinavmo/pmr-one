-- ============================================================
-- PM&R Atlas — Migration 0067 — Flashcard editor workflow
-- FLASHCARDS-IMPLEMENTATION.md Pass 5-6: a draft/published workflow
-- for decks and cards, content versioning so an edit never resets a
-- reader's scheduling by accident, and a soft delete for cards (the
-- review log references them, so a hard delete would orphan rows).
--
-- Every new column defaults to the value that makes EVERY EXISTING
-- row behave exactly as it does today: status defaults to
-- 'published' (not 'draft' — these decks/cards are already live),
-- deleted_at/archived_at/content_updated_at default to NULL (nothing
-- is deleted or archived, nothing was "just updated"). Only decks and
-- cards created through the new admin CMS going forward will
-- explicitly start as 'draft'.
-- ============================================================

ALTER TABLE flashcard_deck
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE flashcard
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  ADD COLUMN IF NOT EXISTS content_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  -- Set only when an edit is flagged "this changes the answer" (never
  -- on a routine typo fix) — powers the reader-facing "UPDATED" chip
  -- for 14 days. Distinct from the pre-existing `updated_at` column
  -- (migration 0065, unused until now), which will be touched on
  -- every save regardless of the flag.
  ADD COLUMN IF NOT EXISTS content_updated_at TIMESTAMPTZ;
