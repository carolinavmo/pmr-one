import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { revalidateDiseaseSurfaces } from "@/lib/revalidation";

// One-time production edit: adds a single combined "Origin -> Insertion"
// column (after "Muscle", before "Nerve") to the 4.5 The deep external
// rotators comparison_table on the hip-anatomy page — one column, not
// two, per founder request (contrast with the earlier Adductors table,
// which got separate Origin/Insertion columns). Reads the block's
// CURRENT content_config at request time and matches each row by its
// existing Muscle-column text, so any other concurrent edit to that
// table's own cells (Nerve/Note) is preserved untouched. Idempotent:
// no-ops if the new column is already present.
const ORIGIN_TO_INSERTION: Record<string, string> = {
  piriformis: "Anterior sacrum (S2–S4) → superior border of the greater trochanter",
  "superior gemellus": "Ischial spine → greater trochanter (via the obturator internus tendon)",
  "obturator internus":
    "Internal surface of the obturator membrane and surrounding bone → medial surface of the greater trochanter",
  "inferior gemellus": "Ischial tuberosity → greater trochanter (via the obturator internus tendon)",
  "obturator externus":
    "External surface of the obturator membrane and surrounding bone → trochanteric fossa of the femur",
  "quadratus femoris": "Lateral border of the ischial tuberosity → quadrate tubercle (intertrochanteric crest)",
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

  const rotatorsIdx = blocks.findIndex(
    (b) =>
      (b.block_type === "subsection_heading" || b.block_type === "subsubsection_heading") &&
      String(b.content_config?.text ?? "").toLowerCase().includes("external rotator")
  );
  if (rotatorsIdx === -1) {
    return NextResponse.json({ ok: false, error: "External rotators heading not found" }, { status: 404 });
  }

  let tableBlock: (typeof blocks)[number] | undefined;
  for (let i = rotatorsIdx + 1; i < blocks.length; i++) {
    if (["section_heading", "subsection_heading", "subsubsection_heading"].includes(blocks[i].block_type)) break;
    if (blocks[i].block_type === "comparison_table") {
      tableBlock = blocks[i];
      break;
    }
  }
  if (!tableBlock) {
    return NextResponse.json({ ok: false, error: "External rotators table not found" }, { status: 404 });
  }

  const cc = tableBlock.content_config as { columns: string[]; rows: string[][] };
  if (cc.columns.some((c) => stripTags(c).includes("origin"))) {
    return NextResponse.json({ ok: true, alreadyApplied: true, blockId: tableBlock.id });
  }

  const newColumns = [cc.columns[0], "<strong>Origin → Insertion</strong>", ...cc.columns.slice(1)];

  const unmatchedRows: string[] = [];
  const newRows = cc.rows.map((row) => {
    const muscleName = stripTags(row[0]).trim();
    const key = Object.keys(ORIGIN_TO_INSERTION).find((k) => muscleName.includes(k));
    if (!key) {
      unmatchedRows.push(row[0]);
      return [row[0], "", ...row.slice(1)];
    }
    return [row[0], ORIGIN_TO_INSERTION[key], ...row.slice(1)];
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
