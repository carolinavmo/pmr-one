-- ============================================================
-- PM&R Atlas — Migration 0029 — Study Planner v1 (Phase 1)
-- One task-tracking table, per-user, mirroring 0006's "additive,
-- doesn't touch the frozen Knowledge Graph" shape. No repeat/reminder
-- fields (Phase 1 scope decision — no notification infra exists in
-- the app; the top-bar bell icon is a decorative stub).
-- linked_content_type/linked_content_id are schema-ready for a future
-- content-link picker but always NULL for now — see comment below.
-- ============================================================

CREATE TABLE study_task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  notes TEXT,

  -- Validated against STUDY_CATEGORY_MAP's keys at the application
  -- layer only (src/lib/study-categories.ts), not a DB CHECK/enum —
  -- the category list is a content decision that may grow, and a
  -- CHECK here would couple every future addition to a migration for
  -- no real integrity benefit (content_translation's own entity_type
  -- TEXT column takes the same approach).
  category TEXT NOT NULL,

  -- A task is scheduled ON a date; start_time is optional and
  -- separate (a task can be date-only, e.g. "sometime today"). DATE
  -- not TIMESTAMPTZ so calendar-grid placement never has to reason
  -- about timezones.
  scheduled_date DATE NOT NULL,
  start_time TIME,

  estimated_minutes INT NOT NULL CHECK (estimated_minutes > 0),

  -- A genuine closed enum (unlike category), so a CHECK is warranted
  -- here — same reasoning content_translation.status's CHECK uses.
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),

  -- Phase 1 ships a plain completed boolean, not a real 3-state
  -- status column — the UI is checkbox-only (complete/uncomplete),
  -- nothing sets "in progress" by hand. The Overall Progress card's
  -- 3-way split is derived at read time instead (see
  -- getOverallProgress in src/lib/study-planner.ts): completed = this
  -- flag; in_progress = incomplete AND scheduled_date <= today;
  -- pending = incomplete AND scheduled_date > today.
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Bare TEXT/TEXT pair, no FK — same tradeoff as
  -- content_translation's entity_type/entity_id (migration 0024):
  -- integrity enforced at the application layer, because this is a
  -- sidecar to many different possible source tables. Always NULL for
  -- now (no picker UI exists yet); kept so a future content-link
  -- picker needs no breaking migration. linked_content_id is TEXT
  -- (not UUID) because a disease-section link would eventually need
  -- to store editorial_block.id — per sections.ts, an anchor is
  -- derived from heading text and must never be persisted as a slug,
  -- so the real stable reference is the block's UUID, stored as text.
  linked_content_type TEXT,
  linked_content_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every read is scoped to one user first (dashboard, month view,
-- streak, progress) — the index that matters most.
CREATE INDEX study_task_user_id_idx ON study_task (user_id);

-- Month-grid / date-range queries filter by user then date range —
-- serves both "this month" and "today"/"upcoming" lookups.
CREATE INDEX study_task_user_id_scheduled_date_idx ON study_task (user_id, scheduled_date);

-- Streak computation scans completed_at for one user — kept separate
-- since completed_at is sparse (NULL until checked off) and queried
-- independently of scheduled_date.
CREATE INDEX study_task_user_id_completed_at_idx ON study_task (user_id, completed_at) WHERE completed_at IS NOT NULL;
