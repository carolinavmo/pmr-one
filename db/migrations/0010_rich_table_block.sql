-- ============================================================
-- PM&R Atlas — Migration 0010 — Rich Table block type
-- A generic table where each column declares its own cell type
-- (plain text, an icon+label list, or a labeled dot-scale) —
-- owns-content, no Knowledge Object underneath. Distinct from
-- Comparison Table, which is a plain string[][] grid: this one
-- exists for tables that need a leading numbered/icon badge per
-- row plus richer per-column cell rendering (e.g. a rehab phase
-- overview), usable in any section, not tied to rehab semantics.
-- ============================================================

ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'rich_table';
