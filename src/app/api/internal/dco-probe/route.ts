import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY, read-only — shows how the AC osteoarthritis page formats its
// callouts so the distal clavicular osteolysis page can match. Remove after use.

export async function POST() {
  try {
    const { rows: d } = await pool.query(
      `SELECT * FROM disease WHERE canonical_name ILIKE '%acromioclavicular osteoarthritis%'`
    );
    const disease = d[0];
    const { rows } = await pool.query(
      `SELECT position, block_type::text AS block_type, content_config, referenced_object_type, authored_content, status::text AS status, display_config
       FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
      [disease.id]
    );
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.block_type] = (counts[r.block_type] ?? 0) + 1;
    const examples: Record<string, unknown[]> = {};
    for (const r of rows) {
      if (["section_heading", "subsection_heading", "subsubsection_heading"].includes(r.block_type)) continue;
      (examples[r.block_type] ??= []);
      if (examples[r.block_type].length < 3) examples[r.block_type].push({ position: r.position, cfg: r.content_config, disp: r.display_config, status: r.status, refType: r.referenced_object_type });
    }
    const flagged = rows
      .filter((r) => /pitfall|pearl|sources?\b|evidence note/i.test(JSON.stringify(r.content_config)))
      .slice(0, 14)
      .map((r) => ({ position: r.position, type: r.block_type, cfg: r.content_config }));
    const { rows: sib } = await pool.query(
      `SELECT canonical_name, slug, status::text AS status, position FROM disease WHERE topic_id = $1 ORDER BY position, canonical_name`,
      [disease.topic_id]
    );
    const { rows: topic } = await pool.query(`SELECT id, name, slug FROM topic WHERE id = $1`, [disease.topic_id]);
    return NextResponse.json({
      disease,
      topic: topic[0],
      siblings: sib,
      total: rows.length,
      counts,
      first: rows.slice(0, 6).map((r) => ({ position: r.position, type: r.block_type, cfg: r.content_config })),
      examples,
      flagged,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
