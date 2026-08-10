-- ============================================================
-- PM&R Atlas — Migration 0019 — Dashboard hero content
-- Makes the signed-in dashboard's hero band (headline, subtitle,
-- background image, stat cards) admin/editor-authored instead of
-- hardcoded — same "editor or admin can author it" gate as disease
-- content (requireEditor() in authoring.ts), not a stricter
-- admin-only tier that doesn't exist anywhere else in the app.
--
-- Singleton table (id always 1) rather than a new editorial_block
-- row — this content isn't attached to any disease and isn't part
-- of the Knowledge Graph, so the existing block system's machinery
-- (position ordering, block_type enum, referenced_object_id) doesn't
-- apply; a dedicated one-row table is the simpler fit.
--
-- `cards` seeds from today's real platform counts (a one-time
-- snapshot at migration time) so the admin's first edit starts from
-- accurate numbers rather than placeholder text — after this,
-- they're fully admin-authored and no longer tied to live counts,
-- same as any other author-entered card content elsewhere in the app.
-- ============================================================

CREATE TABLE IF NOT EXISTS dashboard_hero (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  headline TEXT NOT NULL DEFAULT 'Your Knowledge.
Better Decisions.',
  subtitle TEXT NOT NULL DEFAULT 'Evidence-based conditions, exam maneuvers, and treatment algorithms — built to be read fast when you need an answer.',
  background_image_url TEXT,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO dashboard_hero (id, cards)
SELECT
  1,
  jsonb_build_array(
    jsonb_build_object(
      'label', 'Conditions',
      'value', (SELECT count(*)::text FROM disease WHERE status = 'published'),
      'icon', 'stethoscope',
      'color', 'accent'
    ),
    jsonb_build_object(
      'label', 'Exam Maneuvers',
      'value', (SELECT count(*)::text FROM examination_maneuver),
      'icon', 'hand',
      'color', 'violet'
    ),
    jsonb_build_object(
      'label', 'Clinical Pearls',
      'value', (SELECT count(*)::text FROM clinical_pearl_editorial),
      'icon', 'gem',
      'color', 'rose'
    ),
    jsonb_build_object(
      'label', 'References',
      'value', (SELECT count(*)::text FROM reference),
      'icon', 'book-text',
      'color', 'blue'
    )
  )
ON CONFLICT (id) DO NOTHING;
