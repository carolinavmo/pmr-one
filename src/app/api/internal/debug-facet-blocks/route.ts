import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — diagnostic only. Lists editorial_block rows for
// spine-anatomy around the "4.1 Facet" heading's position so we can
// see the real block_type/content_config shape. Remove after use.
export async function GET() {
  const heading = await pool.query(
    `SELECT eb.id, eb.position, eb.disease_id
     FROM editorial_block eb
     JOIN disease d ON d.id = eb.disease_id
     WHERE d.slug = 'spine-anatomy'
       AND eb.block_type = 'section_heading'
       AND eb.content_config->>'text' = 'Joints and Ligaments'`,
    []
  );

  const h2 = await pool.query(
    `SELECT eb.id, eb.position, eb.block_type
     FROM editorial_block eb
     JOIN disease d ON d.id = eb.disease_id
     WHERE d.slug = 'spine-anatomy'
       AND (eb.content_config->>'text') LIKE '%Facet (zygapophyseal)%'`,
    []
  );

  if (h2.rows.length === 0) {
    return NextResponse.json({ ok: false, error: "heading not found" });
  }
  const { position, disease_id: diseaseId } = h2.rows[0];

  const nearby = await pool.query(
    `SELECT id, position, block_type, content_config
     FROM editorial_block
     WHERE disease_id = $1 AND position > $2
     ORDER BY position ASC
     LIMIT 6`,
    [diseaseId, position]
  );

  return NextResponse.json({
    ok: true,
    headingSearch: heading.rows,
    facetHeading: h2.rows[0],
    nearby: nearby.rows,
  });
}
