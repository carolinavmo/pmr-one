-- ============================================================
-- PM&R Atlas — Migration 0065 — Library-topic copy provenance
-- FLASHCARDS-ADD-TOPIC-IMPLEMENTATION.md: "copy on add, store
-- source_card_id and the version... costs one column now and saves a
-- migration." flashcard.updated_at is new too — nothing previously
-- tracked a per-card edit time, and the source's own updated_at at
-- copy time IS the "version" snapshot future drift-detection needs.
-- ============================================================

ALTER TABLE flashcard ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE flashcard ADD COLUMN IF NOT EXISTS source_card_id UUID REFERENCES flashcard(id) ON DELETE SET NULL;
ALTER TABLE flashcard ADD COLUMN IF NOT EXISTS source_version TIMESTAMPTZ;

-- Lets "already added?" be answered with one indexed lookup instead of
-- diffing card sets.
ALTER TABLE flashcard_category ADD COLUMN IF NOT EXISTS source_category_id UUID REFERENCES flashcard_category(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS flashcard_category_source_category_id_idx ON flashcard_category (source_category_id);
