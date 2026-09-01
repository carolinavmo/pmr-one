import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { revalidateDiseaseSurfaces, revalidateShellSurfaces } from "@/lib/revalidation";
import blocks from "./blocks.json";

// One-time production seed for the Knee Anatomy disease page, imported
// from Knee-Anatomy-PMR-Chapter.docx — same pattern as the earlier
// Elbow Anatomy import this session. Idempotent: if the disease already
// exists, this is a no-op rather than a duplicate insert.
export async function GET() {
  const { rows: existing } = await pool.query(`SELECT id FROM disease WHERE slug = 'knee-anatomy'`);
  if (existing[0]) {
    return NextResponse.json({ ok: true, alreadyExists: true, diseaseId: existing[0].id });
  }

  // Reuse the same topic as the other anatomy chapters rather than
  // hardcoding a topic_id this route can't otherwise know.
  const { rows: topicRows } = await pool.query(
    `SELECT topic_id FROM disease WHERE slug = 'elbow-anatomy'`
  );
  const topicId = topicRows[0]?.topic_id ?? null;

  const { rows: positionRows } = await pool.query(
    `SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM disease WHERE topic_id IS NOT DISTINCT FROM $1`,
    [topicId]
  );
  const position = positionRows[0].next_position;

  const { rows: diseaseRows } = await pool.query(
    `INSERT INTO disease (canonical_name, slug, status, topic_id, source_locale, evidence_based, position)
     VALUES ('Knee Anatomy', 'knee-anatomy', 'published', $1, 'en', true, $2)
     RETURNING id`,
    [topicId, position]
  );
  const diseaseId = diseaseRows[0].id;

  let i = 0;
  for (const block of blocks as { type: string; content_config: Record<string, unknown> }[]) {
    await pool.query(
      `INSERT INTO editorial_block (disease_id, position, block_type, content_config)
       VALUES ($1, $2, $3, $4)`,
      [diseaseId, (i + 1) * 10, block.type, block.content_config]
    );
    i++;
  }

  revalidateDiseaseSurfaces();
  revalidateShellSurfaces();

  return NextResponse.json({ ok: true, diseaseId, topicId, blockCount: i });
}
