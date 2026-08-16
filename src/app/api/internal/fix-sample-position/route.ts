import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — one-time production fix to make the "Sample Deck" /
// "Sample Set" folder sort first in its list, instead of at its
// original "Face" position. Idempotent (always sets to -1 regardless
// of current value), safe to hit more than once. Delete this route
// once confirmed applied in production.
export async function GET() {
  const { rows: flashcardRows } = await pool.query(
    `UPDATE flashcard_category SET position = -1 WHERE name = 'Sample Deck' RETURNING id, name, position`
  );
  const { rows: questionRows } = await pool.query(
    `UPDATE question_category SET position = -1 WHERE name = 'Sample Set' RETURNING id, name, position`
  );

  return NextResponse.json({ ok: true, flashcardRows, questionRows });
}
