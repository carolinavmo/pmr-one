import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the terminology table (Term | Meaning) at the end of the
// "Understanding the terminology" subsection of the Rotator cuff tendinopathy
// page. Placed by content anchors, in one transaction, skipped if already
// there. POST {dryRun:true} reports the plan without writing. Remove once run.

const MARKER = "Rotator cuff-related shoulder pain (RCRSP)";
const s = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = ["Term", "Meaning"];
const ROWS = [
  [s("Rotator cuff tendinopathy"), "Symptoms associated with the rotator cuff tendons, with or without identifiable structural changes."],
  [s("Rotator cuff-related shoulder pain (RCRSP)"), "Broader clinical term encompassing pain associated with the rotator cuff and surrounding subacromial structures."],
  [s("Subacromial pain syndrome (SAPS)"), "Shoulder pain associated with the subacromial region, without necessarily identifying a specific tissue as the source."],
  [s("Subacromial impingement syndrome"), "Traditional term suggesting mechanical compression of subacromial tissues; now considered an incomplete explanation of rotator cuff-related pain."],
  [s("Rotator cuff tear"), "Partial- or full-thickness structural disruption of one or more rotator cuff tendons, which may be symptomatic or asymptomatic."],
];

interface Row {
  position: number;
  block_type: string;
  content_config: Record<string, unknown> | null;
}
const strip = (v: unknown) => String(v ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const preview = (r: Row) => strip(r.content_config?.text ?? r.content_config?.body ?? r.content_config?.label ?? (r.block_type === "comparison_table" ? JSON.stringify(r.content_config?.columns) : "")).slice(0, 60);

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(
      `SELECT d.id FROM disease d JOIN topic t ON t.id = d.topic_id WHERE t.name = 'Shoulder' AND lower(d.canonical_name) = 'rotator cuff tendinopathy'`
    );
    if (d.length !== 1) throw new Error(`expected one page, found ${d.length}`);
    const diseaseId = d[0].id;
    const { rows } = await client.query<Row>(
      `SELECT position, block_type::text AS block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position FOR UPDATE`,
      [diseaseId]
    );

    const already = rows.find((r) => r.block_type === "comparison_table" && JSON.stringify(r.content_config).includes(MARKER));
    if (already) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: `already present at position ${already.position}` });
    }

    const h = rows.findIndex((r) => r.block_type === "subsection_heading" && /^understanding the terminology$/i.test(strip(r.content_config?.text)));
    if (h < 0) throw new Error("subsection 'Understanding the terminology' not found");
    let next = rows.findIndex((r, i) => i > h && (r.block_type === "subsection_heading" || r.block_type === "section_heading"));
    if (next < 0) next = rows.length;
    const section = rows.slice(h, next);
    const anchor = rows[next - 1];
    const plan = { anchorPosition: anchor.position, anchorType: anchor.block_type, subsection: section.map((r) => `${r.position} ${r.block_type}: ${preview(r)}`), nextHeading: rows[next] ? `${rows[next].position} ${preview(rows[next])}` : null };

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }

    await client.query(`UPDATE editorial_block SET position = -(position + 1) WHERE disease_id = $1 AND position > $2`, [diseaseId, anchor.position]);
    await client.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1 AND position < 0`, [diseaseId]);
    const { rows: ins } = await client.query<{ id: string }>(
      `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, 'comparison_table', $3) RETURNING id`,
      [diseaseId, anchor.position + 1, JSON.stringify({ columns: COLUMNS, rows: ROWS })]
    );
    await client.query("COMMIT");
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, inserted: ins[0].id, plan });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
