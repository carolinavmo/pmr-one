import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — applies migration 0054 (reading_progress table) and
// reassigns the 8 MSK region topics' generic placeholder icons to
// their real anatomy-specific ones, against production. Both steps
// are idempotent (IF NOT EXISTS / UPDATE-by-name) — safe to hit more
// than once, and touches nothing else. Remove this route after use.
const ICON_UPDATES: [name: string, icon: string][] = [
  ["Spine", "spine"],
  ["Shoulder", "shoulder"],
  ["Elbow", "elbow"],
  ["Wrist & Hand", "wrist"],
  ["Hip", "hip"],
  ["Knee", "knee"],
  ["Foot & Ankle", "foot-ankle"],
  ["Cranial Nerve & Facial", "neurology"],
];

export async function GET() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reading_progress (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      disease_id UUID NOT NULL REFERENCES disease(id) ON DELETE CASCADE,
      read_section_ids TEXT[] NOT NULL DEFAULT '{}',
      last_section_id TEXT,
      scroll_ratio REAL NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, disease_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS reading_progress_user_id_idx ON reading_progress (user_id)`);

  const iconResults: { name: string; icon: string; updated: number }[] = [];
  for (const [name, icon] of ICON_UPDATES) {
    const result = await pool.query(
      `UPDATE topic SET icon = $1 WHERE name = $2 AND kind = 'topic' RETURNING id`,
      [icon, name]
    );
    iconResults.push({ name, icon, updated: result.rowCount ?? 0 });
  }

  return NextResponse.json({ ok: true, readingProgressTable: "ready", iconResults });
}
