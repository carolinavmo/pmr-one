import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — reorders the "5.1 The canal" comparison_table on the
// production spine-anatomy page to match the source image's column
// order (Region, Shape, Normal AP diameter, Stenosis threshold) and
// row order (Cervical, Thoracic, Lumbar) — the earlier content route
// added the Shape column and Thoracic row but appended/left them out
// of order. Content-only, no schema change. Idempotent — skips if the
// Shape column is already second. Remove this route after use.
const NEW_CONTENT_CONFIG = {
  rows: [
    [
      "<strong>Cervical</strong>",
      "Triangular, largest",
      "~17–18 mm",
      "<strong>&lt; 13 mm</strong> suggests stenosis. The <strong>Torg–Pavlov ratio</strong> (canal : vertebral body) below <strong>0.8</strong> indicates congenital narrowing",
    ],
    [
      '<span class="font-bold">Thoracic</span>',
      "Circular, smallest relative to cord",
      "~12–14 mm",
      "Least reserve space in the spine",
    ],
    [
      "<strong>Lumbar</strong>",
      "Triangular",
      "~15–27 mm",
      "<strong>&lt; 10 mm = absolute</strong> stenosis; <strong>10–12 mm = relative</strong>. Cross-sectional area below ~100 mm&#178; is also used",
    ],
  ],
  caption: "",
  columns: ["<strong>Region</strong>", "Shape", "<strong>Normal AP diameter</strong>", "<strong>Stenosis threshold</strong>"],
};

export async function GET() {
  const { rows: diseaseRows } = await pool.query<{ id: string }>(
    `SELECT id FROM disease WHERE slug = 'spine-anatomy'`
  );
  const disease = diseaseRows[0];
  if (!disease) {
    return NextResponse.json({ ok: false, error: "spine-anatomy disease not found" }, { status: 404 });
  }

  const { rows: target } = await pool.query<{ id: string; content_config: { columns: string[] } }>(
    `SELECT id, content_config FROM editorial_block
     WHERE disease_id = $1 AND block_type = 'comparison_table' AND content_config::text LIKE '%Circular, smallest%'`,
    [disease.id]
  );
  if (target.length === 0) {
    return NextResponse.json({ ok: false, error: "target comparison_table block not found" }, { status: 404 });
  }

  if (target[0].content_config.columns[1] === "Shape") {
    return NextResponse.json({ ok: true, status: "already applied" });
  }

  await pool.query(`UPDATE editorial_block SET content_config = $1 WHERE id = $2`, [
    JSON.stringify(NEW_CONTENT_CONFIG),
    target[0].id,
  ]);

  return NextResponse.json({ ok: true, status: "applied", blockId: target[0].id });
}
