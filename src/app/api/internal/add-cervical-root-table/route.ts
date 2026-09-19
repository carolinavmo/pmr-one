import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db";

// TEMPORARY — inserts the cervical-disc-herniation location/root
// table right after the lumbar version (previous comparison_table,
// matched by its own caption) on the Spine Anatomy page, same
// 3.3.2 subsubsection. Idempotent guard on this table's own caption.
// Two-phase position shift, same pattern as the prior three table
// insertions this session. Remove after use.
const COLUMNS = ["Location", "Root affected", "Example at C5–C6", "Frequency"];
const ROWS: string[][] = [
  [
    "<strong>Posterolateral</strong> (paracentral)",
    "The <strong>exiting root</strong> at that level",
    "<strong>C6</strong>",
    "<strong>Commonest</strong>",
  ],
  [
    "<strong>Foraminal</strong>",
    "The <strong>same exiting root</strong>",
    "<strong>C6</strong>",
    "Common — often spondylotic rather than soft disc",
  ],
  [
    "<strong>Central</strong>",
    "Spinal cord → <strong>myelopathy</strong>, not radiculopathy",
    "Cord compression at C5–C6",
    "Least common, most serious",
  ],
];
const CAPTION = "Cervical disc herniation — location and root affected";
const ANCHOR_CAPTION = "Lumbar disc herniation — location and root affected";

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
       AND eb.block_type = 'comparison_table'
       AND eb.content_config->>'caption' = $1`,
    [ANCHOR_CAPTION]
  );
  if (anchor.rows.length !== 1) {
    return NextResponse.json(
      { ok: false, error: `expected exactly 1 anchor table, found ${anchor.rows.length}` },
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
