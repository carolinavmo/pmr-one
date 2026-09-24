import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — applies migrations 0064 (flashcard_category_favorite)
// and 0065 (copy-on-add provenance columns) against production. All
// statements are idempotent (IF NOT EXISTS) — safe to hit more than
// once, and touches nothing else. Remove this route after use.
export async function GET() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS flashcard_category_favorite (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id UUID NOT NULL REFERENCES flashcard_category(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, category_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS flashcard_category_favorite_user_id_idx ON flashcard_category_favorite (user_id)`);

  await pool.query(`ALTER TABLE flashcard ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
  await pool.query(`ALTER TABLE flashcard ADD COLUMN IF NOT EXISTS source_card_id UUID REFERENCES flashcard(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE flashcard ADD COLUMN IF NOT EXISTS source_version TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE flashcard_category ADD COLUMN IF NOT EXISTS source_category_id UUID REFERENCES flashcard_category(id) ON DELETE SET NULL`);
  await pool.query(`CREATE INDEX IF NOT EXISTS flashcard_category_source_category_id_idx ON flashcard_category (source_category_id)`);

  return NextResponse.json({
    ok: true,
    flashcardCategoryFavoriteTable: "ready",
    provenanceColumns: "ready",
  });
}
