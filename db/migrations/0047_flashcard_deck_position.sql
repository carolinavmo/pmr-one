-- Tracks which card a member last landed on in a deck, so "Continue"
-- (StartDeckButton) can resume there instead of always reopening at
-- card 1. Deliberately separate from flashcard_progress (box/due_at
-- is per-card mastery state; this is a per-deck session cursor) —
-- storing the card id rather than a raw index survives reordering
-- and add/delete in the sibling CardManager, matching how the
-- reviewer's own client-side "cardIdsKey resync" already treats the
-- card list as unstable. card_id is nullable via ON DELETE SET NULL
-- so a deleted card doesn't take the row with it; the reviewer
-- already falls back to index 0 when it can't find the stored id.
CREATE TABLE flashcard_deck_position (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES flashcard_deck(id) ON DELETE CASCADE,
  card_id UUID REFERENCES flashcard(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, deck_id)
);
