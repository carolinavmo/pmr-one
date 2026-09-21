-- ============================================================
-- PM&R Atlas — Migration 0054 — Reading progress
-- SIDEBAR-BAND-SPEC.md's "Reading a page" — per user per disease,
-- which sections have been read (dwelt on 3s+ at >=50% visible, or
-- scrolled past), which one the reader left on, and how far down the
-- page they'd scrolled. Signed-in only — an anonymous reader's
-- progress lives in localStorage instead (nothing to migrate if they
-- sign in later; it just starts fresh server-side, same as every
-- other Personal Workspace feature).
-- ============================================================

CREATE TABLE reading_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  disease_id UUID NOT NULL REFERENCES disease(id) ON DELETE CASCADE,
  read_section_ids TEXT[] NOT NULL DEFAULT '{}',
  last_section_id TEXT,
  scroll_ratio REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, disease_id)
);

CREATE INDEX reading_progress_user_id_idx ON reading_progress (user_id);
