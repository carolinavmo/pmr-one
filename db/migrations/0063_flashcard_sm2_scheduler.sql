-- ============================================================
-- PM&R Atlas — Migration 0063 — Flashcards SM-2 scheduler + review log
-- FLASHCARDS-IMPLEMENTATION.md: "Do not invent a scheduler... implement
-- SM-2... keep the review log complete from day one." A new table set,
-- not a repurposing of flashcard_progress (the old Leitner-box table,
-- db/migrations/0041) — that table stays untouched and keeps backing
-- the existing inline /flashcards/[deckId] study flow until a later
-- pass cuts it over to this one, so nothing breaks mid-rebuild.
-- ============================================================

-- Current scheduler state per (user, card) — mutable, one row, same
-- "current state not history" shape flashcard_progress used, just
-- with SM-2's actual fields (ease factor, a real interval, minute-
-- precision due time for the short learning-phase steps) instead of
-- a fixed Leitner box.
CREATE TABLE flashcard_sm2_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcard(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review')),
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days REAL NOT NULL DEFAULT 0,
  repetitions INT NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, flashcard_id)
);
CREATE INDEX flashcard_sm2_progress_due_idx ON flashcard_sm2_progress (user_id, due_at);

-- The append-only log flashcard_progress never had — "Retention,
-- streak, lapses and 'fix these first' all come from that log, not
-- from the card row" (FLASHCARDS-IMPLEMENTATION.md). deck_id is
-- denormalized from flashcard_id's own deck at review time so every
-- per-deck/per-topic aggregate (retention, lapses-this-week) is a
-- plain WHERE/GROUP BY on this one table, no join back through
-- flashcard needed.
CREATE TABLE flashcard_review_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcard(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES flashcard_deck(id) ON DELETE CASCADE,
  grade TEXT NOT NULL CHECK (grade IN ('again', 'hard', 'good', 'easy')),
  state_before TEXT NOT NULL,
  state_after TEXT NOT NULL,
  interval_before_days REAL NOT NULL,
  interval_after_days REAL NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX flashcard_review_log_user_reviewed_idx ON flashcard_review_log (user_id, reviewed_at);
CREATE INDEX flashcard_review_log_flashcard_idx ON flashcard_review_log (flashcard_id, reviewed_at);
CREATE INDEX flashcard_review_log_deck_reviewed_idx ON flashcard_review_log (deck_id, reviewed_at);
