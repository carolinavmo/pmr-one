import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db";

// TEMPORARY — inserts a facet-orientation-by-region table right after
// the intro paragraph of "4.1 Facet (zygapophyseal) joints" on the
// Spine Anatomy page, before its first subsubsection (4.1.1). Anchor
// is the paragraph block whose body mentions "Their orientation
// determines regional motion" — the exact intro text this table
// expands on. Idempotent guard on this table's own caption. Two-phase
// position shift, same pattern as the prior table insertions this
// session. Remove after use.
const COLUMNS = ["Region", "Orientation", "Permits", "Consequence"];
const ROWS: string[][] = [
  [
    "<strong>Cervical</strong>",
    "~45° from horizontal",
    "All directions",
    "Most mobile, least protected",
  ],
  [
    "<strong>Thoracic</strong>",
    "Coronal, ~60°",
    "Rotation — but ribs restrict the rest",
    "Stiffest region",
  ],
  [
    "<strong>Lumbar</strong>",
    "<strong>Sagittal</strong>",
    "Flexion/extension freely; <strong>rotation only ~2° per segment</strong>",
    "Bends well, <strong>twists badly</strong>",
  ],
];
const CAPTION = "Facet orientation governs everything regional";
const ANCHOR_TEXT = "Their orientation determines regional motion";

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

  const anchor = await pool.query(
    `SELECT eb.id, eb.position, eb.disease_id
     FROM editorial_block eb
     JOIN disease d ON d.id = eb.disease_id
     WHERE d.slug = 'spine-anatomy'
       AND eb.block_type = 'paragraph'
       AND eb.content_config->>'body' LIKE '%' || $1 || '%'`,
    [ANCHOR_TEXT]
  );
  if (anchor.rows.length !== 1) {
    return NextResponse.json(
      { ok: false, error: `expected exactly 1 anchor paragraph, found ${anchor.rows.length}` },
      { status: 400 }
    );
  }
  const { position, disease_id: diseaseId } = anchor.rows[0];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
