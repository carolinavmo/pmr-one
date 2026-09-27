-- ============================================================
-- PM&R Atlas — Migration 0073 — study_plan_task.topic_id
-- (PLANNER-IMPLEMENTATION.md Pass 4, "coverage by topic")
--
-- Pass 2's generator never persisted which plan_topic a task came
-- from — topicQueues only existed in memory during generation.
-- Coverage-by-topic ("one row per topic with its task count and a
-- progress bar") needs a real per-task attribution to count against,
-- not a re-derivation from target_ref that would silently misattribute
-- any task a user later drags, reschedules, or adds by hand. Additive
-- and nullable: existing tasks (and every manually-created/custom
-- task from here on) simply carry no topic attribution, which is
-- honest — they were never generated from one.
-- ============================================================

ALTER TABLE study_plan_task ADD COLUMN topic_id UUID REFERENCES study_plan_topic(id) ON DELETE SET NULL;
CREATE INDEX study_plan_task_topic_id_idx ON study_plan_task (topic_id) WHERE topic_id IS NOT NULL;
