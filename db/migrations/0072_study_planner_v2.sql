-- ============================================================
-- PM&R Atlas — Migration 0072 — Study Planner v2 (PLANNER-SPEC.md)
-- Additive, same as every prior redesign in this app — the old
-- `study_task` table (0029) is left untouched rather than dropped
-- (same "don't destroy existing rows" convention flashcard_progress
-- was kept under when flashcard_sm2_progress superseded it); it just
-- has no remaining application-code reader after this pass. Named
-- study_plan/study_plan_topic/study_plan_task/study_day_log (not the
-- spec's bare plan/task) to keep the app's existing study_*
-- namespacing and avoid colliding with study_task itself.
--
-- "A plan generates tasks. A task points at something in the
-- platform." target_ref is a bare TEXT column with no FK — same
-- tradeoff study_task.linked_content_id and content_translation's
-- entity_id already use, since it points at a different table
-- (disease/flashcard_deck/question_set/course) depending on `type`,
-- enforced at the application layer.
-- ============================================================

CREATE TABLE study_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('exam', 'rotation', 'routine', 'custom')),
  colour_key TEXT NOT NULL CHECK (colour_key IN ('peach', 'rose', 'lilac', 'mint', 'sky', 'butter', 'sage', 'blush')),

  -- Nullable: a weekly routine has no deadline, only 'exam'/'rotation'
  -- plans do.
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'done')),

  -- 1=Mon … 7=Sun (ISO), matching study_plan_task.scheduled_for's own
  -- day-of-week reasoning in the generator.
  study_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  session_minutes INT NOT NULL DEFAULT 30,
  max_tasks_per_day INT NOT NULL DEFAULT 3,

  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX study_plan_user_id_idx ON study_plan (user_id);

-- What a plan covers, and how heavily — the generator's own input
-- (PLANNER-IMPLEMENTATION.md Pass 2: "per_topic = total_slots
-- distributed by plan_topic.weight"). Not built by Pass 1; the table
-- exists now so a plan's topic list survives regenerating its tasks.
CREATE TABLE study_plan_topic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES study_plan(id) ON DELETE CASCADE,
  topic_ref TEXT NOT NULL,
  label TEXT NOT NULL,
  weight INT NOT NULL DEFAULT 1 CHECK (weight > 0),
  position INT NOT NULL DEFAULT 0
);
CREATE INDEX study_plan_topic_plan_id_idx ON study_plan_topic (plan_id);

CREATE TABLE study_plan_task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Nullable — a one-off task (PLANNER-SPEC.md: "Plan: which plan
  -- generated it, or one-off").
  plan_id UUID REFERENCES study_plan(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('read', 'flashcards', 'questions', 'course', 'custom')),
  -- Required for every type except 'custom' (app-layer check, same as
  -- linked_content_id's own convention) — a task with no target is a
  -- note, and belongs in My Handbook, not here.
  target_ref TEXT,

  title TEXT NOT NULL,
  estimate_minutes INT NOT NULL DEFAULT 0,

  scheduled_for DATE NOT NULL,
  -- Set once, when a still-pending task rolls forward off a missed
  -- date — scheduled_for then becomes today, and this keeps the day it
  -- was originally due so the week strip/calendar can still show it as
  -- missed there (PLANNER-SPEC.md rule 4: "never silently deleted").
  original_date DATE,

  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'done', 'skipped')),
  completed_at TIMESTAMPTZ,

  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX study_plan_task_user_id_scheduled_for_idx ON study_plan_task (user_id, scheduled_for);
CREATE INDEX study_plan_task_plan_id_idx ON study_plan_task (plan_id);
-- Rolling-forward's own lookup: every still-pending task whose day has
-- passed, for one user.
CREATE INDEX study_plan_task_rollforward_idx ON study_plan_task (user_id, scheduled_for) WHERE state = 'pending';

-- One row per user per day, upserted as tasks complete — backs the
-- streak and "hours studied this week" without re-summing
-- study_plan_task on every read.
CREATE TABLE study_day_log (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  minutes_studied INT NOT NULL DEFAULT 0,
  tasks_done INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
