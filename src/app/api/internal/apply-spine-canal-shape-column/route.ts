import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — replicates the "5.1 The canal" comparison_table update
// (adds a Shape column and the missing Thoracic row) onto the
// production spine-anatomy page, authored locally via the editor.
// Content-only, no schema change. Idempotent — skips if the new
// content is already present. Remove this route after use.
const NEW_CONTENT_CONFIG = {
  rows: [
    [
      "<strong>Cervical</strong>",
      "~17–18 mm",
      "<strong>&lt; 13 mm</strong> suggests stenosis. The <strong>Torg–Pavlov ratio</strong> (canal : vertebral body) below <strong>0.8</strong> indicates congenital narrowing",
      "Triangular, largest",
    ],
    [
      "<strong>Lumbar</strong>",
      "~15–27 mm",
      "<strong>&lt; 10 mm = absolute</strong> stenosis; <strong>10–12 mm = relative</strong>. Cross-sectional area below ~100 mm&#178; is also used",
      "Triangular",
    ],
    [
      '<span class="font-bold">Thoracic</span>',
      "~12–14 mm",
      "Least reserve space in the spine",
      "Circular, smallest relative to cord",
    ],
  ],
  caption: "",
  columns: ["<strong>Region</strong>", "<strong>Normal AP diameter</strong>", "<strong>Stenosis threshold</strong>", "Shape"],
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

  const { rows: alreadyApplied } = await pool.query(
    `SELECT id FROM editorial_block
     WHERE disease_id = $1 AND block_type = 'comparison_table' AND content_config::text LIKE '%Circular, smallest%'`,
    [diseaseId]
  );
  if (alreadyApplied.length > 0) {
    return NextResponse.json({ ok: true, status: "already applied" });
  }

  const { rows: target } = await pool.query<{ id: string }>(
    `SELECT id FROM editorial_block
     WHERE disease_id = $1 AND block_type = 'comparison_table'
       AND content_config::text LIKE '%Torg%Pavlov%'
       AND content_config::text NOT LIKE '%Circular, smallest%'`,
    [diseaseId]
  );
  if (target.length === 0) {
    return NextResponse.json({ ok: false, error: "target comparison_table block not found" }, { status: 404 });
  }

  await pool.query(`UPDATE editorial_block SET content_config = $1 WHERE id = $2`, [
    JSON.stringify(NEW_CONTENT_CONFIG),
    target[0].id,
  ]);

  return NextResponse.json({ ok: true, status: "applied", blockId: target[0].id });
}
