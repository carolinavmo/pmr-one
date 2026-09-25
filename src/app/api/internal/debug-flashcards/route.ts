import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY, read-only — diagnosing a production report ("known %
// isn't updating"). No writes. Remove after use.
export async function GET() {
  const [deckStatus, cardStatus, progressSample, categoryRow] = await Promise.all([
    pool.query(`SELECT status, archived_at IS NOT NULL AS archived, COUNT(*)::int AS count FROM flashcard_deck GROUP BY status, archived`),
    pool.query(`SELECT status, deleted_at IS NOT NULL AS deleted, COUNT(*)::int AS count FROM flashcard GROUP BY status, deleted`),
    pool.query(
      `SELECT p.flashcard_id, p.user_id, p.state, p.interval_days, p.ease_factor, p.repetitions, p.due_at, p.last_reviewed_at,
         f.question, f.status AS card_status, d.name AS deck_name, d.status AS deck_status
       FROM flashcard_sm2_progress p
       JOIN flashcard f ON f.id = p.flashcard_id
       JOIN flashcard_deck d ON d.id = f.deck_id
       ORDER BY p.last_reviewed_at DESC NULLS LAST
       LIMIT 20`
    ),
    pool.query(
      `SELECT c.id, c.name, c.subject, c.topic_color
       FROM flashcard_category c WHERE c.name = 'Knee & Hip'`
    ).catch((e) => ({ rows: [], error: String(e) })),
  ]);

  return NextResponse.json({
    deckStatusBreakdown: deckStatus.rows,
    cardStatusBreakdown: cardStatus.rows,
    recentProgress: progressSample.rows,
    kneeHipCategory: categoryRow.rows,
  });
}
