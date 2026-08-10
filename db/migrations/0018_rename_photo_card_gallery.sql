-- ============================================================
-- PM&R Atlas — Migration 0018 — Photo Card Gallery (generalized)
-- exam_maneuver_gallery (migration 0017) turned out too narrow: tying
-- every card to an examination_maneuver Knowledge Object blocked
-- using it in any non-Exam section. Renamed to a generic, owns-
-- content block — freeform title/description/illustration/metrics
-- per card, no Knowledge Graph dependency, usable in any section.
-- ============================================================

ALTER TYPE editorial_block_type RENAME VALUE 'exam_maneuver_gallery' TO 'photo_card_gallery';
