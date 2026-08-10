-- ============================================================
-- PM&R Atlas — Migration 0021 — Topic hierarchy
-- A real, persisted multi-level taxonomy (Region > System >
-- Condition-group, arbitrary depth via a plain adjacency list) for
-- the new left-sidebar Index navigation, breadcrumbs, and
-- Previous/Next paging. Replaces the old "regions" concept, which
-- was never a stored column at all — just derived per-request from
-- illustration->anatomy_structure joins (see 0001's "Minimal stub"
-- comment on anatomy_structure) and had no notion of parent/child.
--
-- Adjacency list (parent_id self-reference), not nested sets or a
-- closure table — the tree is small (dozens of nodes) and shallow
-- (3-4 levels), so building it in JS from one flat SELECT is simpler
-- and cheaper than recursive-CTE machinery this app doesn't need yet.
-- ============================================================

CREATE TABLE topic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES topic(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  icon TEXT, -- cardIcons/objectIcons registry key; only top-level topics use one today
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_topic_parent ON topic(parent_id);

-- Nullable — existing/unassigned diseases keep working with no topic
-- until seeded; the sidebar/breadcrumbs/prev-next simply skip a
-- disease with no topic_id rather than erroring.
ALTER TABLE disease ADD COLUMN topic_id UUID REFERENCES topic(id);
