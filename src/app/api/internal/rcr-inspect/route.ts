import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY read-only — lists the headings of the Rotator cuff tendinopathy
// page so a terminology table can be placed. Remove once used.
export async function POST() {
  const { rows: d } = await pool.query<{ id: string; slug: string; status: string }>(
    `SELECT d.id, d.slug, d.status::text AS status FROM disease d JOIN topic t ON t.id = d.topic_id WHERE t.name = 'Shoulder' AND lower(d.canonical_name) = 'rotator cuff tendinopathy'`
  );
  if (d.length !== 1) return NextResponse.json({ ok: false, found: d });
  const { rows } = await pool.query(
    `SELECT position, block_type::text AS bt, left(regexp_replace(coalesce(content_config->>'text', content_config->>'body', content_config->>'label', ''), '<[^>]*>', '', 'g'), 70) AS t
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [d[0].id]
  );
  const heads = rows.filter((r) => r.bt.endsWith("heading"));
  const hits = rows.filter((r) => /terminolog/i.test(r.t));
  return NextResponse.json({ ok: true, disease: d[0], total: rows.length, hits, heads: heads.slice(0, 40), first: rows.slice(0, 8) });
}
