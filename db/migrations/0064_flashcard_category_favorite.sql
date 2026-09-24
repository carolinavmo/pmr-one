-- ============================================================
-- PM&R Atlas — Migration 0064 — Flashcard topic (category) favorites
-- Mirrors flashcard_deck_favorite (migration 0042) exactly, joined to
-- flashcard_category instead — "Your topics" ordering wants
-- favourites first (FLASHCARDS-TOPICS-SECTION.md), the same personal
-- per-user star a deck already has, not a new content type.
-- ============================================================

CREATE TABLE IF NOT EXISTS flashcard_category_favorite (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES flashcard_category(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category_id)
);

CREATE INDEX IF NOT EXISTS flashcard_category_favorite_user_id_idx ON flashcard_category_favorite (user_id);
