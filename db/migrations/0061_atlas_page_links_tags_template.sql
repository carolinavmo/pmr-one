-- ============================================================
-- PM&R Atlas — Migration 0061 — Handbook page tags, library link,
-- and template lineage
-- HANDBOOK-SPEC.md Pass 2 (tags), Pass 4 (library link, "Linked
-- from" backlinks — computed at read time by scanning body HTML for
-- data-atlas-link-id, no new table needed for that part), and the
-- "Template" box ("which template created the page").
-- ============================================================

ALTER TABLE atlas_page ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- The library page a note was written from/about — nullable, at most
-- one per page (the spec shows a single "Linked · MSK › Elbow ›
-- Lateral epicondylopathy" chip, not a list).
ALTER TABLE atlas_page ADD COLUMN IF NOT EXISTS linked_disease_id UUID REFERENCES disease(id) ON DELETE SET NULL;

-- Which OTHER atlas_page (presumably one in the Templates folder) this
-- page was created from, if any — self-referential, nullable.
-- ON DELETE SET NULL: deleting the template doesn't delete pages
-- created from it, it just forgets the lineage.
ALTER TABLE atlas_page ADD COLUMN IF NOT EXISTS template_page_id UUID REFERENCES atlas_page(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS atlas_page_linked_disease_id_idx ON atlas_page (linked_disease_id);
