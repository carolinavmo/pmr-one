import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Read-only: dumps every elbow-anatomy block from the Neuroanatomy
// heading onward, in current position order, to confirm exactly how
// the previous replace-elbow-neuro route's position math went wrong
// (new blocks overflowing past the old next-section position and
// getting swept into the tail-renumbering query) before writing a fix.
export async function GET() {
  const { rows: diseaseRows } = await pool.query(`SELECT id FROM disease WHERE slug = 'elbow-anatomy'`);
  const diseaseId = diseaseRows[0]?.id;
  if (!diseaseId) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const { rows: blocks } = await pool.query(
    `SELECT id, position, block_type, content_config
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );

  const neuroIdx = blocks.findIndex(
    (b) => b.block_type === "section_heading" && String(b.content_config?.text ?? "").includes("Neuroanatomy")
  );

  const fromNeuro = blocks.slice(neuroIdx).map((b) => ({
    id: b.id,
    position: b.position,
    type: b.block_type,
    preview: JSON.stringify(b.content_config).slice(0, 90),
  }));

  return NextResponse.json({ ok: true, neuroIdx, totalFromNeuro: fromNeuro.length, fromNeuro });
}
