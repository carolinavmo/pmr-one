import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db";

// TEMPORARY — inserts a summary table of spinal joints right after the
// "4. Joints and Ligaments" section heading on the Spine Anatomy page,
// before its first subsection (4.1). Idempotent guard on this table's
// own caption. Two-phase position shift, same pattern as the prior
// table insertions this session. Remove after use.
const COLUMNS = ["Joint", "Type", "Between", "Motion", "Note"];
const ROWS: string[][] = [
  [
    "<strong>Intervertebral (discal)</strong>",
    "<strong>Symphysis —</strong> secondary cartilaginous",
    "Adjacent vertebral bodies, via the disc",
    "Compression, small gliding and tilting in all planes",
    "Carries <strong>~80%</strong> of axial load. <strong>23 discs</strong>; first is C2–C3",
  ],
  [
    "<strong>Zygapophyseal (facet)</strong>",
    "<strong>Synovial, plane</strong>",
    "Inferior articular process above ↔ superior articular process below",
    "Determined entirely by <strong>facet orientation</strong>",
    "Two per level. Carries <strong>~20%</strong> of load, more in extension",
  ],
  [
    "<strong>Uncovertebral (Luschka)</strong>",
    "Clefts in the lateral annulus — <strong>not true synovial</strong>",
    "Uncinate process ↔ body above",
    "Guides motion; limits lateral translation",
    "<strong>Cervical only (C3–C7)</strong>",
  ],
  [
    "<strong>Costovertebral</strong>",
    "Synovial",
    "Rib head ↔ two adjacent bodies + the disc",
    "Small gliding",
    "<strong>Thoracic only</strong>",
  ],
  [
    "<strong>Costotransverse</strong>",
    "Synovial",
    "Rib tubercle ↔ transverse process",
    "Small gliding",
    "<strong>Thoracic only</strong>, ribs 1–10",
  ],
  [
    "<strong>Atlanto-occipital</strong>",
    "Synovial, ellipsoid",
    "Occipital condyles ↔ C1 lateral masses",
    "<strong>Flexion/extension</strong> — the “yes” joint",
    "No disc",
  ],
  [
    "<strong>Atlanto-axial</strong>",
    "Synovial — lateral (plane) and median (pivot)",
    "C1 ↔ C2, and the dens ↔ anterior arch",
    "<strong>Rotation</strong> — the “no” joint; <strong>~50% of cervical rotation</strong>",
    "No disc",
  ],
  [
    "<strong>Sacroiliac</strong>",
    "<strong>Hybrid</strong> — anterior third synovial, posterior two-thirds syndesmosis",
    "Sacrum ↔ ilium",
    "A few degrees of nutation",
    "Innervation L4–S3; refers widely",
  ],
  [
    "<strong>Sacrococcygeal</strong>",
    "Symphysis",
    "S5 ↔ Co1",
    "Small flexion/extension",
    "Moves in defecation and childbirth",
  ],
];
const CAPTION = "Joints of the spine — overview";
const ANCHOR_HEADING = "4. Joints and Ligaments";

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
       AND eb.block_type = 'section_heading'
       AND eb.content_config->>'text' = $1`,
    [ANCHOR_HEADING]
  );
  if (anchor.rows.length !== 1) {
    return NextResponse.json(
      { ok: false, error: `expected exactly 1 anchor heading, found ${anchor.rows.length}` },
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
