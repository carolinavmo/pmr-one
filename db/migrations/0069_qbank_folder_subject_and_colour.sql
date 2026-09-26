-- ============================================================
-- PM&R Atlas — Migration 0069 — Question Bank folder subject + colour_key
-- QBANK-IMPLEMENTATION.md Pass 1 — "Create folder and topic... and add
-- the pastel colour_key (eight colours, stored as a key, never a hex)."
-- "Folder" here is question_category (renamed only in UI/spec language,
-- not the table — same DB-name-vs-UI-language split Flashcards already
-- uses for flashcard_category/"topic"); "topic" is question_set, which
-- already sits directly under a folder and holds questions directly —
-- QBANK-SPEC.md's own model ("Subject -> folder -> topic -> question")
-- has no separate "set" layer, so existing sets already ARE what the
-- spec calls topics, no data move needed.
--
-- subject_id reuses flashcard_subject (migration 0068's admin-managed
-- MSK/Neurology/Basic sciences/Other table) rather than a second,
-- duplicate 4-value enum -- the mockup's own subject swatch colours
-- (#A8760F/#5A479C/#0F8A6E/#1F7A4D) are literally the same hexes
-- Flashcards' subjects used before 0068, confirming this is meant to
-- be one shared subject taxonomy across both features, not two.
-- ============================================================

ALTER TABLE question_category ADD COLUMN subject_id UUID REFERENCES flashcard_subject(id);
ALTER TABLE question_category ADD COLUMN colour_key TEXT NOT NULL DEFAULT 'sky'
  CHECK (colour_key IN ('peach', 'rose', 'lilac', 'mint', 'sky', 'butter', 'sage', 'blush'));

UPDATE question_category SET subject_id = (SELECT id FROM flashcard_subject ORDER BY position, name LIMIT 1)
  WHERE subject_id IS NULL;
-- Cycle the 8 colours across existing folders by position so they
-- don't all start on the same default tint. Normalized to a
-- non-negative remainder first -- Postgres's % keeps the dividend's
-- sign (-1 % 8 = -1, not 7), and a real production row has
-- position = -1, which would otherwise index the array at 0 (out of
-- bounds, silently NULL) and fail the NOT NULL constraint below.
UPDATE question_category SET colour_key =
  (ARRAY['peach', 'rose', 'lilac', 'mint', 'sky', 'butter', 'sage', 'blush'])[((position % 8 + 8) % 8) + 1];

ALTER TABLE question_category ALTER COLUMN subject_id SET NOT NULL;

-- "Flagged" (QBANK-SPEC.md's Practice filter) -- no flagging concept
-- existed at all before this pass.
CREATE TABLE question_flag (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX question_flag_question_id_idx ON question_flag (question_id);
