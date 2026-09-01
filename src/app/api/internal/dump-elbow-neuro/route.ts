import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Read-only diagnostic: dumps the current production elbow-anatomy
// block sequence around and inside the Neuroanatomy section, plus
// every subsubsection_heading on the whole page (to confirm the
// numbering convention already in use) before building the
// replacement route.
export async function GET() {
  const { rows: diseaseRows } = await pool.query(`SELECT id FROM disease WHERE slug = 'elbow-anatomy'`);
  if (!diseaseRows[0]) {
    return NextResponse.json({ ok: false, error: "elbow-anatomy not found" }, { status: 404 });
  }
  const diseaseId = diseaseRows[0].id;

  const { rows: blocks } = await pool.query(
    `SELECT id, position, block_type, content_config
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );

  const headingIndices = blocks
    .map((b, i) => ({ i, type: b.block_type, text: b.content_config?.text }))
    .filter((b) => ["section_heading", "subsection_heading", "subsubsection_heading"].includes(b.type));

  const neuroIdx = blocks.findIndex(
    (b) => b.block_type === "section_heading" && String(b.content_config?.text ?? "").includes("Neuroanatomy")
  );

  let nextSectionIdx = -1;
  if (neuroIdx !== -1) {
    for (let i = neuroIdx + 1; i < blocks.length; i++) {
      if (blocks[i].block_type === "section_heading") {
        nextSectionIdx = i;
        break;
      }
    }
  }

  const neuroSlice =
    neuroIdx === -1
      ? []
      : blocks
          .slice(neuroIdx, nextSectionIdx === -1 ? blocks.length : nextSectionIdx)
          .map((b) => ({
            id: b.id,
            position: b.position,
            type: b.block_type,
            preview: JSON.stringify(b.content_config).slice(0, 120),
          }));

  return NextResponse.json({
    ok: true,
    totalBlocks: blocks.length,
    allHeadings: headingIndices.map((h) => ({ type: h.type, text: h.text })),
    neuroIdx,
    nextSectionIdx,
    neuroBlockCount: neuroSlice.length,
    neuroSlice,
    boundaryPositions: {
      neuroHeadingPosition: neuroIdx === -1 ? null : blocks[neuroIdx].position,
      nextSectionPosition: nextSectionIdx === -1 ? null : blocks[nextSectionIdx].position,
      lastBlockPosition: blocks[blocks.length - 1]?.position,
    },
  });
}
