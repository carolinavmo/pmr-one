import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the "pattern / couple affected / clinical picture" table at
// the end of the "Coronal force couple — Deltoid and rotator cuff"
// sub-subsection of the Rotator cuff tendinopathy page. Placed by content
// anchors, one transaction, skipped if already there. POST {dryRun:true}
// reports the plan without writing. Remove once run.

const MARKER = "Supraspinatus tear, cable intact";
const s = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = ["Pattern", "Couple affected", "Clinical picture"];
const ROWS = [
  ["Supraspinatus tear, cable intact", "None critically", "Often well preserved function"],
  [`Tear extending into ${s("infraspinatus")}`, `${s("Transverse")} — posterior arm lost`, "Weak ER, ER lag sign, poor overhead control, loss out of proportion to size"],
  [`${s("Subscapularis")} tear`, `${s("Transverse")} — anterior arm lost`, "Positive belly press / bear hug; biceps may sublux medially"],
  [`Massive tear losing ${s("inferior cuff")}`, s("Coronal"), "Superior migration, AHI &lt;7 mm, pseudoparalysis"],
  ["Serratus or lower trapezius failure", s("Scapular"), "Loss of upward rotation, winging, shrug substitution"],
];

interface Row {
  position: number;
  block_type: string;
  content_config: Record<string, unknown> | null;
}
const strip = (v: unknown) => String(v ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const preview = (r: Row) =>
  `${r.position} ${r.block_type}: ${strip(r.content_config?.text ?? r.content_config?.body ?? r.content_config?.label ?? (r.block_type === "comparison_table" ? JSON.stringify(r.content_config?.columns) : "")).slice(0, 55)}`;
const LEVEL: Record<string, number> = { section_heading: 1, subsection_heading: 2, subsubsection_heading: 3 };
const level = (r: Row) => LEVEL[r.block_type] ?? 99;

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

    const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) >= 2 && level(r) <= 3 && /coronal/i.test(strip(r.content_config?.text)));
    if (hits.length !== 1) throw new Error(`expected one 'Coronal force couple' sub-subsection, found ${hits.length}: ${hits.map((h) => preview(h.r)).join(" | ")}; headings: ${rows.filter((r) => level(r) === 3).map(preview).join(" | ")}`);
    const h = hits[0].i;
    const hl = level(rows[h]);
    let next = rows.findIndex((r, i) => i > h && level(r) <= hl);
    if (next < 0) next = rows.length;
    const anchor = rows[next - 1];
    const plan = { subsubsection: rows.slice(h, next).map(preview), nextHeading: rows[next] ? preview(rows[next]) : null, insertAfterPosition: anchor.position };

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
