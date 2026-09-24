import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — applies migrations 0062 (flashcard_category.topic_color)
// and 0063 (flashcard_sm2_progress, flashcard_review_log) against
// production. All statements are idempotent (IF NOT EXISTS) — safe to
// hit more than once, and touches nothing else. Remove this route
// after use.
export async function GET() {
  await pool.query(`
    ALTER TABLE flashcard_category ADD COLUMN IF NOT EXISTS topic_color TEXT
      CHECK (topic_color IN ('orange', 'pink', 'violet', 'mint', 'sky', 'sunny', 'coral', 'lime'))
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS flashcard_sm2_progress (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      flashcard_id UUID NOT NULL REFERENCES flashcard(id) ON DELETE CASCADE,
      state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review')),
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days REAL NOT NULL DEFAULT 0,
      repetitions INT NOT NULL DEFAULT 0,
      due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_reviewed_at TIMESTAMPTZ,
      PRIMARY KEY (user_id, flashcard_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS flashcard_sm2_progress_due_idx ON flashcard_sm2_progress (user_id, due_at)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS flashcard_review_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      flashcard_id UUID NOT NULL REFERENCES flashcard(id) ON DELETE CASCADE,
      deck_id UUID NOT NULL REFERENCES flashcard_deck(id) ON DELETE CASCADE,
      grade TEXT NOT NULL CHECK (grade IN ('again', 'hard', 'good', 'easy')),
      state_before TEXT NOT NULL,
      state_after TEXT NOT NULL,
      interval_before_days REAL NOT NULL,
      interval_after_days REAL NOT NULL,
      reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS flashcard_review_log_user_reviewed_idx ON flashcard_review_log (user_id, reviewed_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS flashcard_review_log_flashcard_idx ON flashcard_review_log (flashcard_id, reviewed_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS flashcard_review_log_deck_reviewed_idx ON flashcard_review_log (deck_id, reviewed_at)`);

  return NextResponse.json({
    ok: true,
    topicColorColumn: "ready",
    flashcardSm2ProgressTable: "ready",
    flashcardReviewLogTable: "ready",
  });
}
