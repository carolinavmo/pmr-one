-- ============================================================
-- PM&R Atlas — Migration 0070 — question_attempt.wrong_count
-- QBANK-IMPLEMENTATION.md Pass 3's "Worth revisiting" needs to know
-- whether a question has been answered wrong more than once. The
-- target model (Pass 4) makes attempt an append-only log, where that's
-- a plain COUNT(*) -- but question_attempt today is upserted (one row
-- per user+question, PRIMARY KEY (user_id, question_id), see migration
-- 0046's own comment), so a past wrong answer is overwritten the
-- moment the question is answered again. A cumulative counter, bumped
-- on every wrong answer, gets "wrong more than once" right without
-- needing the full attempt-log redesign now.
-- ============================================================

ALTER TABLE question_attempt ADD COLUMN wrong_count INT NOT NULL DEFAULT 0;

-- Backfill: a row currently wrong has been wrong at least once. This
-- underscores existing history the upsert already discarded (a
-- question now correct that was wrong before this migration reads as
-- 0), which is an honest floor, not a fabricated count.
UPDATE question_attempt SET wrong_count = 1 WHERE NOT is_correct;
