-- ============================================================
-- PM&R Atlas — Migration 0030 — Disease position within topic
-- Lets an admin drag-and-drop reorder conditions within a topic in
-- Manage Topics, not just reorder/reparent topics themselves. Same
-- adjacency-list "position" pattern topic.position already uses
-- (0021_topic_hierarchy.sql) — ordering only ever reads
-- `ORDER BY position, canonical_name`, so ties or gaps are harmless.
-- ============================================================

ALTER TABLE disease ADD COLUMN position INT NOT NULL DEFAULT 0;

-- Backfill: number existing diseases within each topic in their
-- current (alphabetical) display order, so shipping this doesn't
-- visibly reshuffle anything already on the site.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY topic_id ORDER BY canonical_name) - 1 AS rn
  FROM disease
  WHERE topic_id IS NOT NULL
)
UPDATE disease SET position = ranked.rn
FROM ranked
WHERE disease.id = ranked.id;
