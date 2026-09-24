import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — applies migration 0066 (flashcard_category.subject, the
// Browse-the-library grouping) and 0067 (the flashcard editor
// workflow: status/reviewed_at/archived_at on decks, status/
// content_version/deleted_at/content_updated_at on cards) against
// production. Both are additive (ADD COLUMN IF NOT EXISTS) with
// defaults that make every existing row behave exactly as it does
// today (subject defaults to 'other', status defaults to
// 'published', nothing archived/deleted). Idempotent — safe to hit
// more than once. Remove this route after use.
export async function GET() {
  await pool.query(
    `ALTER TABLE flashcard_category ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT 'other'
       CHECK (subject IN ('msk', 'neuro', 'basic', 'other'))`
  );

  await pool.query(
    `ALTER TABLE flashcard_deck
       ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
       ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
       ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
       ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`
  );

  await pool.query(
    `ALTER TABLE flashcard
       ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
       ADD COLUMN IF NOT EXISTS content_version INT NOT NULL DEFAULT 1,
       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
       ADD COLUMN IF NOT EXISTS content_updated_at TIMESTAMPTZ`
  );

  const { rows: categoryCheck } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'flashcard_category' AND column_name = 'subject'`
  );
  const { rows: deckCheck } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'flashcard_deck' AND column_name IN ('status', 'reviewed_at', 'reviewed_by', 'archived_at')`
  );
  const { rows: cardCheck } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'flashcard' AND column_name IN ('status', 'content_version', 'deleted_at', 'content_updated_at')`
  );

  return NextResponse.json({
    ok: true,
    categoryColumns: categoryCheck.map((r) => r.column_name),
    deckColumns: deckCheck.map((r) => r.column_name),
    cardColumns: cardCheck.map((r) => r.column_name),
  });
}
