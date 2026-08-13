-- ============================================================
-- PM&R Atlas — Migration 0036 — Clinical calculator favorites
-- Mirrors disease_favorite (migration 0016) exactly, just joined to
-- clinical_calculator instead of disease — a personal per-user star
-- toggle, not a new content type.
-- ============================================================

CREATE TABLE IF NOT EXISTS clinical_calculator_favorite (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calculator_id UUID NOT NULL REFERENCES clinical_calculator(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, calculator_id)
);

CREATE INDEX IF NOT EXISTS clinical_calculator_favorite_user_id_idx ON clinical_calculator_favorite (user_id);
