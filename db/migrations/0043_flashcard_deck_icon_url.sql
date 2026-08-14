-- ============================================================
-- PM&R Atlas — Migration 0043 — Flashcard deck custom icon image
-- Optional uploaded image that overrides the region-derived icon
-- (disease-icons.ts) on a deck's card — same "uploaded asset URL on
-- a column" shape as illustration/simple_image uploads, just on
-- flashcard_deck instead of editorial_block.
-- ============================================================

ALTER TABLE flashcard_deck ADD COLUMN IF NOT EXISTS icon_url TEXT;
