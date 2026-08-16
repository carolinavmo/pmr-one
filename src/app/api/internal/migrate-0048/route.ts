import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — one-time production migration runner for
// db/migrations/0048_folder_sample_access.sql, added because the
// Railway dashboard's Public Networking / Console access wasn't
// working for the site owner. Every statement here is idempotent
// (IF NOT EXISTS / WHERE-scoped UPDATE), so it's safe to hit more
// than once. Delete this route once confirmed applied in production.
export async function GET() {
  await pool.query(
    `ALTER TABLE flashcard_category ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false`
  );
  await pool.query(
    `ALTER TABLE question_category ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false`
  );
  const { rows: flashcardRows } = await pool.query(
    `UPDATE flashcard_category
     SET name = 'Sample Deck', color = 'accent', is_public = true
     WHERE name = 'Face' AND owner_type = 'system'
     RETURNING id, name, is_public`
  );
  const { rows: questionRows } = await pool.query(
    `UPDATE question_category
     SET name = 'Sample Set', color = 'accent', is_public = true
     WHERE name = 'Face'
     RETURNING id, name, is_public`
  );

  return NextResponse.json({ ok: true, flashcardRows, questionRows });
}
