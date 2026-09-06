import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Read-only: checks whether a "Relationship with the sciatic nerve"
// heading already exists on hip-anatomy, and dumps the External
// Rotators section (4.5) in full — the Beaton classification table is
// almost certainly meant to land near there (piriformis/sciatic nerve
// content already lives in that section's highlight_cards) — before
// deciding whether to insert into an existing subsubsection or create
// a new one.
export async function GET() {
  const { rows: diseaseRows } = await pool.query(`SELECT id FROM disease WHERE slug = 'hip-anatomy'`);
  const diseaseId = diseaseRows[0]?.id;
  if (!diseaseId) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const { rows: blocks } = await pool.query(
    `SELECT id, position, block_type, content_config
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );

  const sciaticIdx = blocks.findIndex(
    (b) =>
      ["subsection_heading", "subsubsection_heading"].includes(b.block_type) &&
      String(b.content_config?.text ?? "").toLowerCase().includes("sciatic")
  );

  const rotatorsIdx = blocks.findIndex(
    (b) =>
      ["subsection_heading", "subsubsection_heading"].includes(b.block_type) &&
      String(b.content_config?.text ?? "").toLowerCase().includes("external rotator")
  );

  let rotatorsEndIdx = blocks.length;
  if (rotatorsIdx !== -1) {
    for (let i = rotatorsIdx + 1; i < blocks.length; i++) {
      if (["section_heading", "subsection_heading"].includes(blocks[i].block_type)) {
        rotatorsEndIdx = i;
        break;
      }
    }
  }

  const rotatorsSlice =
    rotatorsIdx === -1
      ? []
      : blocks.slice(rotatorsIdx, rotatorsEndIdx).map((b) => ({
          id: b.id,
          position: b.position,
          type: b.block_type,
          preview: JSON.stringify(b.content_config).slice(0, 150),
        }));

  return NextResponse.json({
    ok: true,
    sciaticHeadingFound: sciaticIdx !== -1,
    sciaticHeadingText: sciaticIdx !== -1 ? blocks[sciaticIdx].content_config?.text : null,
    rotatorsSlice,
  });
}
