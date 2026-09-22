import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — replicates the "4.5.1 Ligaments" sub-subsection (a
// subsubsection_heading + a comparison_table of the five SIJ
// ligaments plus the iliolumbar ligament) onto the production
// spine-anatomy page, authored locally via the editor. Content-only,
// no schema change. Idempotent — skips if the heading already
// exists. Remove this route after use.
export async function GET() {
  const { rows: diseaseRows } = await pool.query<{ id: string }>(
    `SELECT id FROM disease WHERE slug = 'spine-anatomy'`
  );
  const disease = diseaseRows[0];
  if (!disease) {
    return NextResponse.json({ ok: false, error: "spine-anatomy disease not found" }, { status: 404 });
  }
  const diseaseId = disease.id;

  const { rows: existing } = await pool.query(
    `SELECT id FROM editorial_block
     WHERE disease_id = $1 AND block_type = 'subsubsection_heading' AND content_config->>'text' = '4.5.1 Ligaments'`,
    [diseaseId]
  );
  if (existing.length > 0) {
    return NextResponse.json({ ok: true, status: "already applied" });
  }

  const { rows: sijRows } = await pool.query<{ position: number }>(
    `SELECT position FROM editorial_block
     WHERE disease_id = $1 AND block_type = 'subsection_heading' AND content_config->>'text' LIKE '4.5 %'`,
    [diseaseId]
  );
  const sijHeadingPosition = sijRows[0]?.position;
  if (sijHeadingPosition === undefined) {
    return NextResponse.json({ ok: false, error: "4.5 The sacroiliac joint heading not found" }, { status: 404 });
  }

  const { rows: nextSectionRows } = await pool.query<{ position: number }>(
    `SELECT position FROM editorial_block
     WHERE disease_id = $1 AND block_type = 'section_heading' AND position > $2
     ORDER BY position ASC LIMIT 1`,
    [diseaseId, sijHeadingPosition]
  );
  const nextSectionPosition = nextSectionRows[0]?.position;
  if (nextSectionPosition === undefined) {
    return NextResponse.json({ ok: false, error: "next section heading not found" }, { status: 404 });
  }
  const afterPosition = nextSectionPosition - 1;

  await pool.query(
    `UPDATE editorial_block SET position = -(position + 2)
     WHERE disease_id = $1 AND position > $2`,
    [diseaseId, afterPosition]
  );
  await pool.query(
    `UPDATE editorial_block SET position = -position
     WHERE disease_id = $1 AND position < 0`,
    [diseaseId]
  );

  await pool.query(
    `INSERT INTO editorial_block (disease_id, position, block_type, content_config)
     VALUES ($1, $2, 'subsubsection_heading', $3)`,
    [diseaseId, afterPosition + 1, JSON.stringify({ text: "4.5.1 Ligaments" })]
  );

  const comparisonTable = {
    rows: [
      [
        "Interosseous sacroiliac",
        "Sacral tuberosity → ilium, filling the space behind the synovial portion",
        '<span class="font-bold">The strongest ligament in the body.</span> The main bond of the joint',
      ],
      ["Posterior sacroiliac", "Posterior ilium → sacrum", "Resists counternutation"],
      [
        "Anterior sacroiliac",
        "A thin capsular thickening",
        '<span class="font-bold">The weakest</span> — and a common source of anterior SIJ pain',
      ],
      [
        "Sacrotuberous",
        "Sacrum and PSIS → ischial tuberosity",
        'Resists <span class="font-bold">nutation</span>; continuous with the biceps femoris tendon',
      ],
      ["Sacrospinous", "Sacrum → ischial spine", "Resists nutation; divides the greater and lesser sciatic foramina"],
      ["Iliolumbar", "L5 transverse process → iliac crest", "Stabilises L5 on the sacrum"],
    ],
    caption: "",
    columns: ["Ligament", "Course", "Function"],
  };

  await pool.query(
    `INSERT INTO editorial_block (disease_id, position, block_type, content_config)
     VALUES ($1, $2, 'comparison_table', $3)`,
    [diseaseId, afterPosition + 2, JSON.stringify(comparisonTable)]
  );

  return NextResponse.json({ ok: true, status: "applied", diseaseId, afterPosition });
}
