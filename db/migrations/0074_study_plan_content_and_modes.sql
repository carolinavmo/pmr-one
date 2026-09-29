-- ============================================================
-- PM&R Atlas — Migration 0074 — Study Planner v3: ordered content,
-- plan modes (PLANNER-SPEC.md "Share, flexible plans, and completion")
--
-- Replaces plan_topic's weighted-subject model going forward: a plan
-- is now an ORDERED LIST of library content (a knowledge-graph topic
-- folder, or an individual page/deck/question set), not a set of
-- weighted flashcard_subject rows. Additive — study_plan_topic and
-- every column/row that already depends on it are untouched, so a
-- plan created before this migration keeps working exactly as it did;
-- the generator falls back to the old weighted logic when a plan has
-- no study_plan_item rows (see generateTasksForPlan's own comment).
--
-- "folder" content resolves through the knowledge-graph `topic` table
-- (disease.topic_id), not flashcard_subject — the two are different
-- granularities (4 broad subjects vs ~20 real topics), and the
-- mockup's own folder names ("Spinal cord injury", "Stroke", "MSK —
-- spine") are topic-tree names, not subject names. Question sets have
-- no per-topic linkage in this schema (question_category only carries
-- a subject_id), so a folder only ever expands to read/flashcards
-- content; a question set is only ever added as its own plan_item.
-- ============================================================

ALTER TABLE study_plan ADD COLUMN mode TEXT NOT NULL DEFAULT 'scheduled' CHECK (mode IN ('scheduled', 'flexible', 'target'));
ALTER TABLE study_plan ADD COLUMN order_mode TEXT NOT NULL DEFAULT 'interleave' CHECK (order_mode IN ('interleave', 'one_topic', 'as_listed'));
-- Target mode only — "about N tasks a week" with no day assigned.
ALTER TABLE study_plan ADD COLUMN weekly_target INT;

-- The ordered content list a plan's tasks are generated from.
-- kind='folder' → ref_id is a topic.id, expanded to its diseases
-- (read) and any decks sourced from those diseases (flashcards).
-- kind='page'/'deck'/'question_set' → ref_id is that table's own id,
-- added individually alongside or instead of a whole folder.
CREATE TABLE study_plan_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES study_plan(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('folder', 'page', 'deck', 'question_set')),
  ref_id UUID NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX study_plan_item_plan_id_idx ON study_plan_item (plan_id);

-- Nullable: a flexible or target-mode task has no day at all — it
-- lives in the queue (queue_position) instead. A scheduled-mode task
-- still always sets scheduled_for; rollForwardMissedTasks's own
-- `scheduled_for < CURRENT_DATE` check is NULL-safe already (NULL <
-- anything is NULL, never true), so an unscheduled task is correctly
-- never swept as "missed" — flexible plans have no overdue.
ALTER TABLE study_plan_task ALTER COLUMN scheduled_for DROP NOT NULL;
ALTER TABLE study_plan_task ADD COLUMN queue_position INT;
-- How a task got marked done — 'auto' is Pass 5's own event-driven
-- completion (not built yet); the column exists now so that pass is
-- additive too, same "the schema anticipates the next pass" precedent
-- topic_id (0073) already set for coverage-by-topic.
ALTER TABLE study_plan_task ADD COLUMN completed_via TEXT CHECK (completed_via IN ('auto', 'manual', 'bulk'));

-- plan_item's own equivalent of topic_id (0073) — a v2 plan's
-- generated task is attributed to the folder/page/deck/question_set
-- it came from, so coverage-by-topic keeps working under the new
-- content model. Separate column rather than repointing topic_id:
-- that FK can only reference study_plan_topic, a different table.
ALTER TABLE study_plan_task ADD COLUMN plan_item_id UUID REFERENCES study_plan_item(id) ON DELETE SET NULL;
CREATE INDEX study_plan_task_plan_item_id_idx ON study_plan_task (plan_item_id) WHERE plan_item_id IS NOT NULL;
