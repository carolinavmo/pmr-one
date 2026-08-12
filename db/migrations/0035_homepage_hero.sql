-- ============================================================
-- PM&R Atlas — Migration 0035 — Homepage hero content
-- Makes the signed-out landing page's hero band (title, subtitle,
-- 4 feature cards) admin/editor-authored instead of hardcoded i18n
-- strings — same "editor or admin can author it" gate as disease
-- content (requireEditor() in authoring.ts).
--
-- Singleton table (id always 1), mirroring dashboard_hero's own
-- shape (migration 0019) — this content isn't attached to any
-- disease and isn't part of the Knowledge Graph, so a dedicated
-- one-row table is the simpler fit over a new editorial_block row.
--
-- Cards are a fixed 4-slot array (title + body only) rather than an
-- open-ended list — icons stay hardcoded in the component, matching
-- what was actually asked for (editable text, not a card-management
-- UI). Seeded with the current live copy so the first edit starts
-- from real content, not placeholders.
--
-- Locale-agnostic by design, matching dashboard_hero: no per-locale
-- translation row for this content, same as every other editable
-- field in the app today (source_locale/content_translation exist in
-- the schema per migration 0024, but nothing in the app actually
-- reads/writes them yet — Phase C was scoped, never built).
-- ============================================================

CREATE TABLE IF NOT EXISTS homepage_hero (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title TEXT NOT NULL DEFAULT 'Evidence-based learning for modern physiatrists.',
  subtitle TEXT NOT NULL DEFAULT 'Your trusted resource for PM&R knowledge — evidence-based conditions, exam maneuvers, and treatment algorithms, built to be read fast when you need an answer.',
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO homepage_hero (id, cards)
SELECT
  1,
  jsonb_build_array(
    jsonb_build_object(
      'title', 'Evidence-Based',
      'body', 'Reviewed by PM&R editors and kept current'
    ),
    jsonb_build_object(
      'title', 'Clinical Focused',
      'body', 'Practical knowledge for real-world practice'
    ),
    jsonb_build_object(
      'title', 'Structured Learning',
      'body', 'Organized by topic, built for clarity'
    ),
    jsonb_build_object(
      'title', 'Track Progress',
      'body', 'Plan your study and track your progress'
    )
  )
ON CONFLICT (id) DO NOTHING;
