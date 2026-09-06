import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Read-only: locate the "4.5 The deep external rotators" subsection
// on hip-anatomy and dump every block between it and the next heading,
// so the exact current table shape/content is known before adding an
// Origin -> Insertion column.
export async function GET() {
  const { rows: diseaseRows } = await pool.query(`SELECT id FROM disease WHERE slug = 'hip-anatomy'`);
  const diseaseId = diseaseRows[0]?.id;
  if (!diseaseId) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const { rows: blocks } = await pool.query(
    `SELECT id, position, block_type, content_config
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );

  const startIdx = blocks.findIndex(
    (b) =>
      (b.block_type === "subsection_heading" || b.block_type === "subsubsection_heading") &&
      String(b.content_config?.text ?? "").toLowerCase().includes("external rotator")
  );
  if (startIdx === -1) {
    return NextResponse.json({ ok: false, error: "External rotators heading not found" }, { status: 404 });
  }

  let endIdx = blocks.length;
  for (let i = startIdx + 1; i < blocks.length; i++) {
    if (["section_heading", "subsection_heading", "subsubsection_heading"].includes(blocks[i].block_type)) {
      endIdx = i;
      break;
    }
  }

  const slice = blocks.slice(startIdx, endIdx).map((b) => ({
    id: b.id,
    position: b.position,
    type: b.block_type,
    content_config: b.content_config,
  }));

  return NextResponse.json({ ok: true, slice });
}
