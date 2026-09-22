-- The library home's Pass 3 feature panel (design/LIBRARY-HOME-MIX-SPEC.md)
-- needs an editor-set "this is this week's topic" flag plus a short
-- authored pitch, separate from the page's own body content.
ALTER TABLE disease ADD COLUMN is_topic_of_week BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE disease ADD COLUMN topic_of_week_pitch TEXT;

-- Enforced at most once sitewide ("one feature per page") — a partial
-- unique index rather than a separate singleton table, since this is
-- one boolean on an existing row, not new content.
CREATE UNIQUE INDEX disease_topic_of_week_singleton ON disease (is_topic_of_week) WHERE is_topic_of_week;
