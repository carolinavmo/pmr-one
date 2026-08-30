import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { revalidateDiseaseSurfaces } from "@/lib/revalidation";

// Temporary, one-shot data-fix route — same pattern as the migration/
// seed routes (hardcoded, idempotent, no user input, deleted after it
// runs once). Several headings in Shoulder Anatomy V7 were stored as
// top-level section_heading even though they read as sub-items of the
// immediately preceding chapter/part (e.g. "2.3 The Proximal Humerus"
// sitting alongside "2.1"/"2.2", which are correctly subsection_heading),
// which made them wrongly appear in the "On this page" index. Demotes
// each one tier, cascading to its own children where that would
// otherwise collide with a sibling tier — verified against the local
// dev DB first (see the session's own tmp_fix_v7_index.mjs, already
// deleted).

const demoteToSubsection = [
  650, 1310, 1500, 1590, 1990, 2360, 2760, 2830, 3160, 3190, 3230, 3250, 3280, 3300, 3320,
];
const demoteToSubsubsection = [677, 717, 1327, 1357, 1467, 1517];

export async function GET() {
  const d = await pool.query(`SELECT id FROM disease WHERE slug = 'shoulder-anatomy-v7'`);
  const diseaseId = d.rows[0]?.id as string | undefined;
  if (!diseaseId) {
    return NextResponse.json({ ok: false, error: "shoulder-anatomy-v7 not found" }, { status: 404 });
  }

  const results: { position: number; toType: string; text: string | null }[] = [];

  for (const position of demoteToSubsection) {
    const r = await pool.query(
      `UPDATE editorial_block SET block_type = 'subsection_heading'
       WHERE disease_id = $1 AND position = $2 AND block_type = 'section_heading'
       RETURNING content_config->>'text' as text`,
      [diseaseId, position]
    );
    results.push({ position, toType: "subsection_heading", text: r.rows[0]?.text ?? null });
  }
  for (const position of demoteToSubsubsection) {
    const r = await pool.query(
      `UPDATE editorial_block SET block_type = 'subsubsection_heading'
       WHERE disease_id = $1 AND position = $2 AND block_type = 'subsection_heading'
       RETURNING content_config->>'text' as text`,
      [diseaseId, position]
    );
    results.push({ position, toType: "subsubsection_heading", text: r.rows[0]?.text ?? null });
  }

  revalidateDiseaseSurfaces();
  return NextResponse.json({ ok: true, diseaseId, results });
}
