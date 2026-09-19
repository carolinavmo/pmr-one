import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db";

// TEMPORARY — inserts the disc-herniation-terminology comparison
// table right after "3.3 Herniation — the anatomy of it" on the
// Spine Anatomy page. Idempotent guard on the caption. Two-phase
// position shift (see the earlier coccyx-table route this session)
// avoids the (disease_id, position) unique-constraint collision a
// single bulk +1 update can hit. Remove after use.
const COLUMNS = ["Term", "Definition", "Note"];
const ROWS: string[][] = [
  [
    "<strong>Bulge</strong>",
    "Circumferential extension of disc beyond the endplate margins, involving <strong>&gt;25% of the circumference</strong>",
    "<strong>Not a herniation.</strong> A normal age-related finding",
  ],
  [
    "<strong>Protrusion</strong>",
    "Focal displacement where the <strong>base is wider than the dome</strong>",
    "Contained by the outer annulus",
  ],
  [
    "<strong>Extrusion</strong>",
    "The <strong>dome is wider than the base</strong> — the material has squeezed through a narrow neck",
    "Annulus breached",
  ],
  [
    "<strong>Sequestration</strong>",
    "<strong>A free fragment</strong>, no longer continuous with the parent disc",
    "May migrate",
  ],
];
const CAPTION = "Disc herniation terminology";

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
       AND eb.content_config->>'text' = '3.3 Herniation — the anatomy of it'`
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
