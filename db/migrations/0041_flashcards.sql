-- Flashcards: preset (system) decks + member-created decks, with a
-- simple Leitner-box spaced-repetition progress table. Deliberately a
-- standalone table set rather than a 15th KnowledgeObjectType — see
-- docs/product-spec-v1.md §2.6 (Flashcard is a Learning Object, not a
-- Knowledge Object). Preset flashcards are copies of the existing
-- self_check editorial-block Q&A text, not live references to it —
-- simpler than the spec's "derived, never copied" ideal, and zero
-- regression risk to the disease pages those self_check blocks live on.

CREATE TABLE flashcard_deck (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('system', 'user')),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'neutral',
  source_disease_id UUID REFERENCES disease(id) ON DELETE SET NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((owner_type = 'user') = (user_id IS NOT NULL))
);
CREATE INDEX flashcard_deck_user_id_idx ON flashcard_deck (user_id);

CREATE TABLE flashcard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES flashcard_deck(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX flashcard_deck_id_idx ON flashcard (deck_id);

-- box 1..5 (Leitner); due_at is a plain DATE (day-level scheduling is
-- enough for a "review today" list — no need for time-of-day precision).
CREATE TABLE flashcard_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcard(id) ON DELETE CASCADE,
  box INT NOT NULL DEFAULT 1,
  due_at DATE NOT NULL DEFAULT CURRENT_DATE,
  last_reviewed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, flashcard_id)
);
CREATE INDEX flashcard_progress_user_id_idx ON flashcard_progress (user_id);
