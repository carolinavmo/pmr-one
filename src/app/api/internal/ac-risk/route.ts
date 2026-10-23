import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the risk-factor associations table (Category /
// Associations) to the "Risk Factors" subsection of the Adhesive Capsulitis
// page, right under the subsection heading (before any sub-subsection). Placed
// by content anchors, one transaction, skipped if already there. POST
// {dryRun:true} reports the plan without writing. Remove once run.

const MARKER = "Parkinson";
const b = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = ["Category", "Associations"];
const ROWS = [
  [b("Endocrine and metabolic"), "Thyroid disease (hypo- and hyperthyroidism) · dyslipidaemia"],
  [b("Fibrotic conditions"), "Dupuytren's disease — shared genetics and shared myofibroblast biology"],
  [b("Neurological"), "Stroke · Parkinson's disease"],
  [
    b("After an event"),
    `Cardiac and thoracic surgery · breast cancer surgery and axillary dissection · radiotherapy · shoulder trauma or surgery · any ${b("prolonged immobilisation")}`,
  ],
  [b("Local shoulder pathology"), "Rotator cuff disease, particularly where pain has driven disuse"],
];

interface Row {
  position: number;
  block_type: string;
  content_config: Record<string, unknown> | null;
}
const strip = (v: unknown) => String(v ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const LEVEL: Record<string, number> = { section_heading: 1, subsection_heading: 2, subsubsection_heading: 3 };
const level = (r: Row) => LEVEL[r.block_type] ?? 99;
const preview = (r: Row) =>
  `${r.position} L${level(r)} ${r.block_type}: ${strip(r.content_config?.text ?? r.content_config?.body ?? r.content_config?.label ?? (r.block_type === "comparison_table" ? JSON.stringify(r.content_config?.columns) : "")).slice(0, 55)}`;

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(
      `SELECT d.id FROM disease d WHERE d.canonical_name ILIKE '%adhesive capsulitis%'`
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

    const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) === 2 && /^risk factors$/i.test(strip(r.content_config?.text)));
    if (hits.length !== 1) throw new Error(`expected one Risk Factors subsection, found ${hits.length}: ${hits.map((x) => preview(x.r)).join(" | ")}`);
    const h = hits[0].i;
    let next = rows.findIndex((r, i) => i > h && level(r) <= 2);
    if (next < 0) next = rows.length;
    // right under the heading, after any intro text and before the first sub-subsection
    const sec = rows.slice(h + 1, next);
    const firstSub = sec.findIndex((r) => level(r) === 3);
    const anchor = firstSub < 0 ? (sec.length ? sec[sec.length - 1] : rows[h]) : firstSub === 0 ? rows[h] : sec[firstSub - 1];
    const plan = {
      section: rows.slice(h, next).map(preview),
      nextHeading: rows[next] ? preview(rows[next]) : null,
      insertAfterPosition: anchor.position,
      insertAfter: preview(anchor),
    };

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
