-- ============================================================
-- PM&R Atlas — Migration 0071 — Question Bank sessions
-- QBANK-IMPLEMENTATION.md Pass 4 — "A session is built once and
-- stored, so Resume is exact." QBANK-SPEC.md's own model:
--   session       id, user_id, mode, built_from (json), position,
--                 started_at, finished_at
--   session_item  session_id, question_id, order, attempt_id
--
-- session_item deliberately has no attempt_id / answer columns of its
-- own: question_attempt (upserted, one row per user+question) already
-- carries the answer, and every session question is guaranteed unique
-- within the session at build time ("never repeat a question inside
-- one session"), so a plain (session_id, question_id, position)
-- manifest is enough to resume exactly and drive the question map --
-- no duplicated answer state to keep in sync. Keeping question_attempt
-- as the one place an answer lives is also what makes recordAttempt's
-- existing wrong_count/accuracy math apply to session answers for
-- free, without a parallel bookkeeping path.
-- ============================================================

CREATE TABLE question_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'tutor' CHECK (mode IN ('tutor', 'exam', 'timed')),
  built_from JSONB NOT NULL DEFAULT '{}',
  position INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
-- One open session per user at a time (getActiveSession's own lookup) —
-- a partial index over just the unfinished rows, since that's the only
-- shape that's ever looked up by user_id alone.
CREATE INDEX question_session_active_idx ON question_session (user_id) WHERE finished_at IS NULL;

CREATE TABLE question_session_item (
  session_id UUID NOT NULL REFERENCES question_session(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  position INT NOT NULL,
  PRIMARY KEY (session_id, question_id)
);
CREATE INDEX question_session_item_session_id_idx ON question_session_item (session_id, position);
