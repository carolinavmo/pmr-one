-- A structured table inside a Highlight Card's colored box, instead
-- of prose — Highlight Card's chrome (icon chip, eyebrow label,
-- colorable) wrapped around Rich Table's columns/rows. See
-- HighlightTableBlock in src/lib/editorial-blocks.ts.
ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'highlight_table';
