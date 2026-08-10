-- ============================================================
-- PM&R Atlas — Migration 0020 — Dashboard hero scrim toggle
-- Lets an editor/admin turn off the legibility gradient
-- DashboardHeroSection.tsx always used to draw over an uploaded
-- background image. Defaults to true (scrim on) so every existing
-- hero — and any new upload — keeps the safe, legible-by-default
-- behavior unless an admin explicitly opts out for an image they've
-- judged doesn't need it.
-- ============================================================

ALTER TABLE dashboard_hero ADD COLUMN IF NOT EXISTS background_scrim BOOLEAN NOT NULL DEFAULT true;
