import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — applies migrations 0060 (atlas_page.is_pinned) and 0061
// (atlas_page.tags/linked_disease_id/template_page_id) against
// production. Idempotent (IF NOT EXISTS throughout) — safe to hit more
// than once, and touches nothing else. Remove this route after use.
export async function GET() {
  await pool.query(`ALTER TABLE atlas_page ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false`);

  await pool.query(`ALTER TABLE atlas_page ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'`);
  await pool.query(`ALTER TABLE atlas_page ADD COLUMN IF NOT EXISTS linked_disease_id UUID REFERENCES disease(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE atlas_page ADD COLUMN IF NOT EXISTS template_page_id UUID REFERENCES atlas_page(id) ON DELETE SET NULL`);
  await pool.query(`CREATE INDEX IF NOT EXISTS atlas_page_linked_disease_id_idx ON atlas_page (linked_disease_id)`);

  return NextResponse.json({ ok: true, atlasPageColumns: "ready" });
}
