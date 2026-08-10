ALTER TABLE topic ADD COLUMN color TEXT;

-- Backfill the 3 existing top-level topics to the color they already
-- implicitly render today (IndexSidebar.tsx's old cycled-by-index
-- default), so nothing visually changes on the live sidebar until an
-- admin explicitly edits a topic's color.
UPDATE topic SET color = 'blue' WHERE slug = 'lower-extremity';
UPDATE topic SET color = 'violet' WHERE slug = 'upper-extremity';
UPDATE topic SET color = 'rose' WHERE slug = 'cranial-nerve-facial';
