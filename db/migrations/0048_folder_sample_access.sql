-- ============================================================
-- PM&R Atlas — Migration 0048 — Sample-folder public access for
-- Flashcards + Question Bank
-- Mirrors 0037's clinical-calculator gating: every folder stays
-- browsable in the list for a signed-out visitor, but a locked
-- folder's contents are gated behind sign-in on its detail page.
-- Defaults to false (members-only) so folders are members-only until
-- explicitly opened up. The existing "Face" folder (Bell's Palsy
-- content, the smallest of the 3 system folders) in each feature is
-- repurposed as the one open sample folder a signed-out visitor can
-- fully browse — renamed accordingly, no decks/sets moved.
-- ============================================================

ALTER TABLE flashcard_category ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE question_category ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

UPDATE flashcard_category
SET name = 'Sample Deck', color = 'accent', is_public = true
WHERE name = 'Face' AND owner_type = 'system';

UPDATE question_category
SET name = 'Sample Set', color = 'accent', is_public = true
WHERE name = 'Face';
