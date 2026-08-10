-- ============================================================
-- PM&R Atlas — Migration 0013 — Image Comparison, Citation Card,
-- Callout Banner block types
-- Image Comparison: two images side by side (owns-content, reuses
-- the same local-disk upload mechanism illustrations already use).
-- Citation Card: a single prominent reference, singular embed like
-- Risk Factor/Clinical Pearl, reusing the existing `reference` table.
-- Callout Banner: a generic 3-tone (info/success/warning) editorial
-- note — deliberately not a 4th "error" tone, which doesn't have a
-- clear editorial use case on a disease reference page and has no
-- dedicated color token in the design system.
-- ============================================================

ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'image_comparison';
ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'citation_card';
ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'callout_banner';
