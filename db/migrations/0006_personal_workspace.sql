-- ============================================================
-- PM&R Atlas — Migration 0006 — Personal Workspace v1
-- Additive only, doesn't touch the frozen Knowledge Graph. Scoped to
-- exactly three real capabilities that need no further product
-- debate: a note per user per disease, a saved/bookmarked Clinical
-- Pearl, and a page-view log for "recently viewed." Deliberately NOT
-- Flashcards or "saved Treatment Protocols" — those reopen the same
-- Quiz-adjacent territory this project has kept closed all session
-- (see LESSONS_LEARNED.md #15, #23).
-- ============================================================

-- One note per user per disease — a scratchpad per topic, not a
-- running note-taking log. Re-saving overwrites (application layer
-- upserts via ON CONFLICT).
CREATE TABLE note (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  disease_id UUID NOT NULL REFERENCES disease(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, disease_id)
);

-- Bookmarking an existing clinical_pearl_editorial row — not a new
-- content type, just a personal join to content that already exists.
CREATE TABLE pearl_save (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinical_pearl_id UUID NOT NULL REFERENCES clinical_pearl_editorial(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, clinical_pearl_id)
);

-- Upserted on every disease-page view (viewed_at bumped, not
-- appended) — "recently viewed" falls out of ORDER BY viewed_at DESC
-- with no separate cleanup job needed.
CREATE TABLE page_view (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  disease_id UUID NOT NULL REFERENCES disease(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, disease_id)
);

CREATE INDEX note_user_id_idx ON note (user_id);
CREATE INDEX pearl_save_user_id_idx ON pearl_save (user_id);
CREATE INDEX page_view_user_id_viewed_at_idx ON page_view (user_id, viewed_at DESC);
