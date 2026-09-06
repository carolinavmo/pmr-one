import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { revalidateDiseaseSurfaces } from "@/lib/revalidation";

// One-time production edit: adds "Origin" and "Insertion" columns
// (after "Muscle", before "Nerve (roots)") to the 4.4 Adductors
// comparison_table on the hip-anatomy page. Reads the block's CURRENT
// content_config at request time (not a hardcoded snapshot) and
// matches each row by its existing Muscle-column text so any other
// concurrent admin edit to that table's own cells (Nerve/Note) is
// preserved untouched — only the two new columns are inserted.
// Idempotent: no-ops if "Origin" is already a column title.
const ORIGIN_INSERTION: Record<string, { origin: string; insertion: string }> = {
  "adductor longus": {
    origin: "Anterior body of the pubis, just below the pubic crest",
    insertion: "Middle third of the linea aspera (femur)",
  },
  "adductor brevis": {
    origin: "Body and inferior ramus of the pubis",
    insertion: "Pectineal line and proximal linea aspera (femur)",
  },
  "adductor magnus": {
    origin:
      "Adductor part: inferior pubic ramus and ischial ramus<br>Hamstring part: ischial tuberosity",
    insertion:
      "Adductor part: linea aspera and medial supracondylar line<br>Hamstring part: adductor tubercle",
  },
  gracilis: {
    origin: "Body and inferior ramus of the pubis",
    insertion: "Pes anserinus, medial proximal tibia",
  },
  pectineus: {
    origin: "Pectineal line of the pubis (superior pubic ramus)",
    insertion: "Pectineal line of the femur, between the lesser trochanter and linea aspera",
  },
};

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").toLowerCase();
}

export async function GET() {
  const { rows: diseaseRows } = await pool.query(`SELECT id FROM disease WHERE slug = 'hip-anatomy'`);
  const diseaseId = diseaseRows[0]?.id;
  if (!diseaseId) return NextResponse.json({ ok: false, error: "disease not found" }, { status: 404 });

  const { rows: blocks } = await pool.query(
    `SELECT id, position, block_type, content_config
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );

  const adductorsIdx = blocks.findIndex(
    (b) =>
      (b.block_type === "subsection_heading" || b.block_type === "subsubsection_heading") &&
      String(b.content_config?.text ?? "").toLowerCase().includes("adductor")
  );
  if (adductorsIdx === -1) {
    return NextResponse.json({ ok: false, error: "Adductors heading not found" }, { status: 404 });
  }

  let tableBlock: (typeof blocks)[number] | undefined;
  for (let i = adductorsIdx + 1; i < blocks.length; i++) {
    if (["section_heading", "subsection_heading", "subsubsection_heading"].includes(blocks[i].block_type)) break;
    if (blocks[i].block_type === "comparison_table") {
      tableBlock = blocks[i];
      break;
    }
  }
  if (!tableBlock) {
    return NextResponse.json({ ok: false, error: "Adductors table not found" }, { status: 404 });
  }

  const cc = tableBlock.content_config as { columns: string[]; rows: string[][] };
  if (cc.columns.some((c) => stripTags(c) === "origin")) {
    return NextResponse.json({ ok: true, alreadyApplied: true, blockId: tableBlock.id });
  }

  const newColumns = [cc.columns[0], "<strong>Origin</strong>", "<strong>Insertion</strong>", ...cc.columns.slice(1)];

  const unmatchedRows: string[] = [];
  const newRows = cc.rows.map((row) => {
    const muscleName = stripTags(row[0]).trim();
    const key = Object.keys(ORIGIN_INSERTION).find((k) => muscleName.includes(k));
    if (!key) {
      unmatchedRows.push(row[0]);
      return [row[0], "", "", ...row.slice(1)];
    }
    const { origin, insertion } = ORIGIN_INSERTION[key];
    return [row[0], origin, insertion, ...row.slice(1)];
  });

  if (unmatchedRows.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Row(s) didn't match a known muscle — aborting without changing anything", unmatchedRows },
      { status: 409 }
    );
  }

  await pool.query(
    `UPDATE editorial_block
     SET content_config = content_config || jsonb_build_object('columns', $2::jsonb, 'rows', $3::jsonb)
     WHERE id = $1`,
    [tableBlock.id, JSON.stringify(newColumns), JSON.stringify(newRows)]
  );

  revalidateDiseaseSurfaces();

  return NextResponse.json({ ok: true, blockId: tableBlock.id, newColumns, newRows });
}
