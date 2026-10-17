import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the "Irritability / What you observed / Starting dose / Why"
// table at the end of the "Turning the examination into a plan" subsection of
// the Rotator cuff tendinopathy page. Placed by content anchors, one
// transaction, skipped if already there. POST {dryRun:true} reports the plan
// without writing. Remove once run.

const MARKER = "Isotonic loading in the comfortable range";
const b = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = ["Irritability", "What you observed", "Starting dose", "Why"];
const ROWS = [
  [
    b("High"),
    "Pain at rest and at night; provoked by light or brief activity; takes hours to settle",
    `${b("Isometrics")}, short lever, unloaded positions. 1–3 weeks`,
    "The tendon cannot currently tolerate movement under load. The aim is to keep <em>some</em> stimulus going without a flare",
  ],
  [
    b("Moderate"),
    "Pain with sustained or repeated mid-range use; settles within the hour",
    `${b("Isotonic loading in the comfortable range")}, 2–3 × weekly`,
    "Enough tolerance to train, not enough to train freely yet",
  ],
  [
    b("Low"),
    "Pain only at heavy load, end range, or high volume; settles quickly",
    b("Load properly and heavily"),
    `At this end, the common error is not flare-up — it is ${b("underdosing")}. Programmes that stay light here fail quietly`,
  ],
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

    const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) >= 2 && level(r) <= 3 && /findings that set the starting dose/i.test(strip(r.content_config?.text)));
    if (hits.length !== 1) throw new Error(`expected one 'Findings that set the starting dose' heading, found ${hits.length}: ${hits.map((x) => preview(x.r)).join(" | ")}`);
    const h = hits[0].i;
    // directly under the irritability lead-in paragraph that follows the heading
    const lead = rows[h + 1];
    if (!lead || lead.block_type !== "paragraph" || !/^irritability is/i.test(strip(lead.content_config?.body))) {
      throw new Error(`lead-in paragraph not where expected: ${lead ? preview(lead) : "none"}`);
    }
    const anchor = lead;
    const hl = level(rows[h]);
    let next = rows.findIndex((r, i) => i > h && level(r) <= hl);
    if (next < 0) next = rows.length;
    const plan = { section: rows.slice(h, next).map(preview), nextHeading: rows[next] ? preview(rows[next]) : null, insertAfterPosition: anchor.position };

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
