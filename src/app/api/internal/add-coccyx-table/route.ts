import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db";

// TEMPORARY — inserts the "Sacrum vs Coccyx" comparison table right
// after the "Why the coccyx matters?" subsubsection heading on the
// Spine Anatomy page. Idempotent guard on the caption. Remove after
// use.
const COLUMNS = ["", "Sacrum", "Coccyx"];
const ROWS: string[][] = [
  ["Segments", "<strong>5 fused vertebrae</strong>", "Usually 4 (variable 3–5)"],
  ["Main role", "<strong>Load transfer spine → pelvis</strong>", "Pelvic floor/ligament attachment"],
  ["Superior articulation", "L5", "Sacrum"],
  ["Major lateral articulation", "<strong>SI joints</strong>", "None"],
  ["Neural foramina", "Anterior + posterior sacral foramina", "None comparable"],
  ["Important landmark", "<strong>Sacral hiatus</strong>", "Coccygeal tip"],
  ["Clinical relevance", "SI region, sacral fractures, caudal epidural access", "<strong>Coccydynia</strong>"],
];
const CAPTION = "Sacrum vs Coccyx";

export async function GET() {
  const existing = await pool.query(
    `SELECT eb.id FROM editorial_block eb
     JOIN disease d ON d.id = eb.disease_id
     WHERE d.slug = 'spine-anatomy'
       AND eb.block_type = 'comparison_table'
       AND eb.content_config->>'caption' = $1`,
    [CAPTION]
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ ok: false, error: "already inserted", id: existing.rows[0].id });
  }

  const heading = await pool.query(
    `SELECT eb.id, eb.position, eb.disease_id
     FROM editorial_block eb
     JOIN disease d ON d.id = eb.disease_id
     WHERE d.slug = 'spine-anatomy'
       AND eb.block_type = 'subsubsection_heading'
       AND eb.content_config->>'text' = 'Why the coccyx matters?'`
  );
  if (heading.rows.length !== 1) {
    return NextResponse.json(
      { ok: false, error: `expected exactly 1 matching heading, found ${heading.rows.length}` },
      { status: 400 }
    );
  }
  const { position, disease_id: diseaseId } = heading.rows[0];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Two-phase shift — a single "position = position + 1" bulk update
    // can collide with the (disease_id, position) unique constraint
    // when Postgres processes rows out of order (row at N becomes N+1
    // while a not-yet-updated row still sits at N+1). Moving everything
    // out to a disjoint range first, then back down to the real target,
    // avoids the collision entirely.
    await client.query(
      `UPDATE editorial_block SET position = position + 100000 WHERE disease_id = $1 AND position > $2`,
      [diseaseId, position]
    );
    await client.query(
      `UPDATE editorial_block SET position = position - 99999 WHERE disease_id = $1 AND position > $2`,
      [diseaseId, position + 100000]
    );
    await client.query(
      `INSERT INTO editorial_block (id, disease_id, position, block_type, content_config, source_locale)
       VALUES ($1, $2, $3, 'comparison_table', $4, 'en')`,
      [
        randomUUID(),
        diseaseId,
        position + 1,
        JSON.stringify({ caption: CAPTION, columns: COLUMNS, rows: ROWS }),
      ]
    );
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, insertedAtPosition: position + 1 });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
