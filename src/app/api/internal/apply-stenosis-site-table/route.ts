import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — adds a "Stenosis by site" comparison_table (Site / What
// is compressed / Usual cause — central canal, lateral recess,
// foramen) to the "5.1 The canal" sub-subsection on the production
// spine-anatomy page, authored locally via the editor. Inserted right
// after the paragraph that introduces those three compartments
// ("Stenosis may be central... lateral recess... foraminal..."),
// found by content rather than a hardcoded position since production
// content has diverged from local dev around this section. Uses the
// negate-then-restore trick to shift later positions up by one
// without tripping the (disease_id, position) unique constraint.
// Content-only, no schema change. Idempotent — skips if the table's
// own text is already present. Remove this route after use.
const NEW_TABLE = {
  rows: [
    [
      "<strong>Central canal</strong>",
      "Cord (above L1–L2) or cauda equina (below)",
      "Ligamentum flavum hypertrophy, disc bulge, facet overgrowth",
    ],
    [
      "<strong>Lateral recess</strong> (subarticular)",
      "The <strong>traversing</strong> root",
      "Superior articular facet hypertrophy",
    ],
    [
      "<strong>Foramen</strong>",
      "The <strong>exiting</strong> root",
      "Disc height loss, facet osteophyte, far lateral disc",
    ],
  ],
  caption: "",
  columns: ["<strong>Site</strong>", "<strong>What is compressed</strong>", "<strong>Usual cause</strong>"],
};

export async function GET() {
  const { rows: diseaseRows } = await pool.query<{ id: string }>(
    `SELECT id FROM disease WHERE slug = 'spine-anatomy'`
  );
  const disease = diseaseRows[0];
  if (!disease) {
    return NextResponse.json({ ok: false, error: "spine-anatomy disease not found" }, { status: 404 });
  }
  const diseaseId = disease.id;

  const { rows: already } = await pool.query(
    `SELECT id FROM editorial_block
     WHERE disease_id = $1 AND content_config::text LIKE '%Ligamentum flavum hypertrophy, disc bulge, facet overgrowth%'`,
    [diseaseId]
  );
  if (already.length > 0) {
    return NextResponse.json({ ok: true, status: "already applied" });
  }

  const { rows: anchor } = await pool.query<{ position: number }>(
    `SELECT position FROM editorial_block
     WHERE disease_id = $1 AND content_config::text LIKE '%(subarticular, catching the traversing root)%'
     LIMIT 1`,
    [diseaseId]
  );
  if (anchor.length === 0) {
    return NextResponse.json({ ok: false, error: "anchor paragraph not found" }, { status: 404 });
  }
  const anchorPosition = anchor[0].position;

  await pool.query(
    `UPDATE editorial_block SET position = -(position + 1) WHERE disease_id = $1 AND position > $2`,
    [diseaseId, anchorPosition]
  );
  await pool.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1 AND position < 0`, [
    diseaseId,
  ]);
  await pool.query(
    `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, 'comparison_table', $3)`,
    [diseaseId, anchorPosition + 1, JSON.stringify(NEW_TABLE)]
  );

  return NextResponse.json({ ok: true, status: "applied", insertedAt: anchorPosition + 1 });
}
