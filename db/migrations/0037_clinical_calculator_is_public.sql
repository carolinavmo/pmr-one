-- ============================================================
-- PM&R Atlas — Migration 0037 — Clinical calculator public access
-- Every calculator's card stays visible/browsable to signed-out
-- visitors on /clinical-tools regardless of this flag — only the
-- interactive calculator itself (the actual instrument) is gated for
-- non-public rows. Defaults to false (members-only) so newly authored
-- calculators are members-only until explicitly opened up; the four
-- free-preview instruments are flipped to true below.
-- ============================================================

ALTER TABLE clinical_calculator ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

UPDATE clinical_calculator
SET is_public = true
WHERE slug IN ('barthel-index', 'berg-balance-scale', 'lefs', 'house-brackmann');
