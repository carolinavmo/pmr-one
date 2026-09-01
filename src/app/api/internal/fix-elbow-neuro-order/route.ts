import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { revalidateDiseaseSurfaces } from "@/lib/revalidation";

// Repairs the original replace-elbow-neuro route's position bug (see
// that route's own history: it computed new-block positions without
// checking they'd fit before the old next-section position, so 44 of
// 72 new blocks overflowed and got swept into a tail-renumbering
// query, interleaving with "7. Vascular Anatomy"/"Rapid Revision" by
// raw position order).
//
// A content-matching classifier (the first version of this route)
// breaks once a block has been admin-edited since insertion —
// confirmed: 5 of the 72 picked up new <span> styling in the editor
// before this fix ran. This version never looks at content at all.
// It classifies purely by created_at: every block this session
// inserted shares one transaction timestamp, distinct from the
// genuine tail content's (much earlier) timestamp — immune to any
// content edit. Both the overflow sweep and the original insert loop
// only ever assigned positions in ascending order within each group,
// so sorting each group by its *current* position recovers the
// correct relative order — this route only ever UPDATEs position,
// never content_config, id, or anything else.
export async function GET() {
  const { rows: diseaseRows } = await pool.query(`SELECT id FROM disease WHERE slug = 'elbow-anatomy'`);
  const diseaseId = diseaseRows[0]?.id;
  if (!diseaseId) return NextResponse.json({ ok: false, error: "disease not found" }, { status: 404 });

  const { rows: blocks } = await pool.query(
    `SELECT id, position, block_type, created_at, content_config
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );

  const neuroIdx = blocks.findIndex(
    (b) => b.block_type === "section_heading" && String(b.content_config?.text ?? "").includes("Neuroanatomy")
  );
  if (neuroIdx === -1) {
    return NextResponse.json({ ok: false, error: "Neuroanatomy heading not found" }, { status: 404 });
  }
  const neuroHeadingPosition = blocks[neuroIdx].position;
  const afterNeuro = blocks.slice(neuroIdx + 1);

  const counts = new Map<string, number>();
  for (const b of afterNeuro) {
    const key = new Date(b.created_at).toISOString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const clusters = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const mineTimestamp = clusters[0]?.[0];
  const mineCount = clusters[0]?.[1] ?? 0;

  if (clusters.length !== 2 || mineCount !== 72) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected created_at clustering — aborting without touching anything",
        clusters,
      },
      { status: 409 }
    );
  }

  const mineRows = afterNeuro
    .filter((b) => new Date(b.created_at).toISOString() === mineTimestamp)
    .sort((a, b) => a.position - b.position);
  const tailRows = afterNeuro
    .filter((b) => new Date(b.created_at).toISOString() !== mineTimestamp)
    .sort((a, b) => a.position - b.position);

  const alreadyOrdered =
    Math.max(...mineRows.map((b) => b.position)) < Math.min(...tailRows.map((b) => b.position));
  if (alreadyOrdered) {
    return NextResponse.json({ ok: true, alreadyFixed: true, mineCount: mineRows.length, tailCount: tailRows.length });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let cursor = neuroHeadingPosition;
    for (const row of [...mineRows, ...tailRows]) {
      cursor += 10;
      await client.query(`UPDATE editorial_block SET position = $1 WHERE id = $2`, [cursor, row.id]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  revalidateDiseaseSurfaces();

  return NextResponse.json({ ok: true, fixed: true, mineCount: mineRows.length, tailCount: tailRows.length });
}
