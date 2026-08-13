-- ============================================================
-- PM&R Atlas — Migration 0038 — Swap LEFS for Katz Index in the
-- free-preview set. Public/free-to-run calculators are now:
-- barthel-index, berg-balance-scale, katz-index, house-brackmann.
-- ============================================================

UPDATE clinical_calculator SET is_public = false WHERE slug = 'lefs';
UPDATE clinical_calculator SET is_public = true WHERE slug = 'katz-index';
