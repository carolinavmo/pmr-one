-- ============================================================
-- PM&R Atlas — Migration 0042 — Flashcard deck favorites
-- Mirrors clinical_calculator_favorite (migration 0036) exactly,
-- just joined to flashcard_deck instead — a personal per-user star
-- toggle, not a new content type. Works for both system (preset) and
-- user-owned decks; ownership of the deck itself is unrelated to
-- whether a user has starred it.
-- ============================================================

CREATE TABLE IF NOT EXISTS flashcard_deck_favorite (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES flashcard_deck(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, deck_id)
);

CREATE INDEX IF NOT EXISTS flashcard_deck_favorite_user_id_idx ON flashcard_deck_favorite (user_id);
