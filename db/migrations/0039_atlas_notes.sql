-- ============================================================
-- PM&R Atlas — Migration 0039 — "My PM&R Atlas" personal notes
-- A member's own free-form pages, grouped into sections. The three
-- starter sections (My Pages / My Protocols / Templates) are just
-- ordinary pre-seeded rows — created lazily in application code the
-- first time a member visits, not a special "kind" here.
-- ============================================================

CREATE TABLE atlas_section (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX atlas_section_user_id_idx ON atlas_section (user_id);

CREATE TABLE atlas_page (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES atlas_section(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX atlas_page_user_id_idx ON atlas_page (user_id);
CREATE INDEX atlas_page_section_id_idx ON atlas_page (section_id);
