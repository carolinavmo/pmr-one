-- ============================================================
-- PM&R Atlas — Migration 0016 — Disease header meta
-- Adds the two genuinely editorial fields the new disease-page
-- header needs (an Evidence-Based flag, a 1-5 Board Relevance
-- rating) plus a per-user Favourite toggle mirroring pearl_save's
-- shape exactly. "Updated <date>" and "Reading time" are deliberately
-- NOT stored — the former reads disease.updated_at (bumped by these
-- same header edits), the latter is computed from block content at
-- read time, so neither needed a column.
-- ============================================================

ALTER TABLE disease ADD COLUMN IF NOT EXISTS evidence_based BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE disease ADD COLUMN IF NOT EXISTS board_relevance SMALLINT CHECK (board_relevance BETWEEN 1 AND 5);

CREATE TABLE IF NOT EXISTS disease_favorite (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  disease_id UUID NOT NULL REFERENCES disease(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, disease_id)
);

CREATE INDEX IF NOT EXISTS disease_favorite_user_id_idx ON disease_favorite (user_id);
