-- ============================================================
-- PM&R Atlas — Migration 0062 — Flashcard topic colour
-- FLASHCARDS-SPEC.md's Candy palette: "A topic stores a palette key,
-- not a hex value." flashcard_category IS the topic entity (folders
-- and topics are the same rows) — this adds a dedicated topic_color
-- column separate from the existing `color` (the app-wide CardColor
-- palette, still used for the folder's icon chip until a later pass
-- rewires the dashboard onto the Candy palette).
-- ============================================================

ALTER TABLE flashcard_category ADD COLUMN IF NOT EXISTS topic_color TEXT
  CHECK (topic_color IN ('orange', 'pink', 'violet', 'mint', 'sky', 'sunny', 'coral', 'lime'));
