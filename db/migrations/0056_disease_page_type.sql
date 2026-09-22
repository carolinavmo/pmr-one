-- The library home's Browse-by-area list and Hero chips both need a
-- type per page (anatomy, biomechanics, examination, condition,
-- rehabilitation, procedure) — nothing in the schema captures this
-- today, every page is a generic `disease` row. Nullable and
-- unbackfilled on purpose: existing pages start unset (design/
-- LIBRARY-HOME-MIX-SPEC.md's audit rule — "do not infer from the
-- title"), an editor sets each by hand via the new /admin/page-types
-- list or the disease page's own header.
CREATE TYPE disease_page_type AS ENUM (
  'anatomy', 'biomechanics', 'examination', 'condition', 'rehabilitation', 'procedure'
);

ALTER TABLE disease ADD COLUMN type disease_page_type;
