-- ============================================================
-- PM&R Atlas — Migration 0014 — Badge Row block type
-- A standalone horizontal row of light/outline pill badges (icon +
-- editable text + color), distinct from the dark-fill badges
-- ParagraphBlock already supports on its own callout cards — this
-- one can be dropped anywhere on the page, not just attached to a
-- paragraph.
-- ============================================================

ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'badge_row';
