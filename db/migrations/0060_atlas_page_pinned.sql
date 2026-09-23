-- ============================================================
-- PM&R Atlas — Migration 0060 — Atlas page pinned flag
-- HANDBOOK-SPEC.md's rail: "Rows show a star when pinned, otherwise
-- a relative time" and the ★ Pinned filter chip. A plain per-page
-- boolean, same shape as disease.is_topic_of_week (0057) but with no
-- singleton constraint — a member can pin as many of their own pages
-- as they like.
-- ============================================================

ALTER TABLE atlas_page ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
