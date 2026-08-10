-- ============================================================
-- PM&R Atlas — Migration 0015 — Icon List block type
-- A titled, color-coded vertical list — each item shows either a
-- small icon badge or, when no icon is set, a plain bullet point.
-- Two of these combined via the existing row-layout mechanism (e.g.
-- "Aggravating Factors" / "Relieving Factors") reproduce a side-by-
-- side comparison without a new two-column block type.
-- ============================================================

ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'icon_list';
