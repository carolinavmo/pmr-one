ALTER TABLE flashcard_category ADD COLUMN IF NOT EXISTS owner_type TEXT NOT NULL DEFAULT 'system' CHECK (owner_type IN ('system', 'user'));
ALTER TABLE flashcard_category ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'flashcard_category_owner_check'
  ) THEN
    ALTER TABLE flashcard_category
      ADD CONSTRAINT flashcard_category_owner_check CHECK ((owner_type = 'user') = (user_id IS NOT NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS flashcard_category_user_id_idx ON flashcard_category (user_id);
