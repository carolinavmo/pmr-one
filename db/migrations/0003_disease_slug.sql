-- ============================================================
-- PM&R Atlas — Migration 0003 — Disease slug
-- Found authoring the Plantar Fasciopathy reference implementation
-- (Sprint 3): disease has no stable URL identity. canonical_name
-- isn't safe to route on — spec §11A explicitly notes terminology
-- drifts ("fasciitis" -> "fasciopathy"), so a slug computed from
-- canonical_name at request time would silently break existing links
-- the moment an editor renames a disease. `aliases` doesn't fit
-- either — it's documented for terminology/ICD-10 lookup, not
-- guaranteed URL-safe or unique. A stored, stable slug is the
-- correct fix, same category as the reviewed_by FK stub closed in
-- migration 0002: a real gap, small mechanical patch.
-- ============================================================

ALTER TABLE disease ADD COLUMN slug TEXT UNIQUE;
