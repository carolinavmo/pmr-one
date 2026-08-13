-- ============================================================
-- PM&R Atlas — Migration 0040 — Atlas section color + manual
-- drag-and-drop ordering for sections and pages.
-- ============================================================

ALTER TABLE atlas_section ADD COLUMN color TEXT NOT NULL DEFAULT 'neutral';
ALTER TABLE atlas_section ADD COLUMN position INT NOT NULL DEFAULT 0;
ALTER TABLE atlas_page ADD COLUMN position INT NOT NULL DEFAULT 0;

-- Backfill any existing rows into a stable order (position was always 0
-- until now, so every row currently ties — order by created_at instead).
UPDATE atlas_section s SET position = t.rn - 1
FROM (SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY created_at) AS rn FROM atlas_section) t
WHERE s.id = t.id;

UPDATE atlas_page p SET position = t.rn - 1
FROM (SELECT id, row_number() OVER (PARTITION BY section_id ORDER BY created_at) AS rn FROM atlas_page) t
WHERE p.id = t.id;
