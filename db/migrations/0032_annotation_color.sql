-- Lets a member pick which of the app's existing 8 decorative colors
-- (CardColor — src/lib/editorial-blocks.ts, src/lib/card-colors.ts)
-- a given highlight uses, instead of every highlight being a fixed
-- accent tint. Reuses that single existing palette rather than
-- inventing a second color system — same reasoning as every other
-- colorable surface in this app (card backgrounds, badges, rich-text
-- highlight formatting).
ALTER TABLE annotation ADD COLUMN color TEXT NOT NULL DEFAULT 'accent';
