import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Temporary, one-shot READ-ONLY route — same "temporary internal
// route" convention as every migrate-/seed- route, but this one makes
// no writes. Dumps the CURRENT production content for Elbow Anatomy
// (edited live as admin since the original seed) so it can be pulled
// down as the actual basis for translation, rather than translating a
// now-stale local dev copy. Deleted right after it's fetched once.
export async function GET() {
  const d = await pool.query(`SELECT id FROM disease WHERE slug = 'elbow-anatomy'`);
  const diseaseId = d.rows[0]?.id as string | undefined;
  if (!diseaseId) {
    return NextResponse.json({ ok: false, error: "elbow-anatomy not found" }, { status: 404 });
  }
  const b = await pool.query(
    `SELECT block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position ASC`,
    [diseaseId]
  );
  return NextResponse.json({ ok: true, diseaseId, blocks: b.rows });
}
