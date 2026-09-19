import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db";

// TEMPORARY — inserts the lumbar-disc-herniation location/root table
// right after "3.3.2 Which root is compressed — the rule to
// memorise" on the Spine Anatomy page. Idempotent guard on the
// caption. Two-phase position shift, same as the two prior table
// insertions this session. Remove after use.
const COLUMNS = ["Location", "Root affected", "Example at L4–L5", "Frequency"];
const ROWS: string[][] = [
  [
    "<strong>Paracentral</strong> (subarticular)",
    "The <strong>TRAVERSING</strong> root — passing through to exit one level below",
    "<strong>L5</strong>",
    "<strong>Commonest</strong> (~60–70%)",
  ],
  [
    "<strong>Central</strong>",
    "Cauda equina, or multiple roots bilaterally",
    "L5, S1 and below — <strong>emergency</strong>",
    "Uncommon, but most dangerous",
  ],
  [
    "<strong>Foraminal</strong>",
    "The <strong>EXITING</strong> root",
    "<strong>L4</strong>",
    "Uncommon (~5–10%)",
  ],
  [
    "<strong>Far lateral</strong> (extraforaminal)",
    "The <strong>EXITING</strong> root",
    "<strong>L4</strong>",
    "Uncommon (~10%)",
  ],
];
const CAPTION = "Lumbar disc herniation — location and root affected";

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
    `SELECT eb.id, eb.position, eb.disease_id, eb.block_type
     FROM editorial_block eb
     JOIN disease d ON d.id = eb.disease_id
     WHERE d.slug = 'spine-anatomy'
       AND eb.content_config->>'text' = '3.3.2 Which root is compressed — the rule to memorise'`
  );
  if (heading.rows.length !== 1) {
    return NextResponse.json(
      { ok: false, error: `expected exactly 1 matching heading, found ${heading.rows.length}` },
      { status: 400 }
    );
  }
  const { position, disease_id: diseaseId, block_type: blockType } = heading.rows[0];

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
    return NextResponse.json({ ok: true, headingBlockType: blockType, insertedAtPosition: position + 1 });
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
