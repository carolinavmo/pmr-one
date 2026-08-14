CREATE TABLE IF NOT EXISTS flashcard_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'neutral',
  icon TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE flashcard_deck ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES flashcard_category(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS flashcard_deck_category_id_idx ON flashcard_deck (category_id);
