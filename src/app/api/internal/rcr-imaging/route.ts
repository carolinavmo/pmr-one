import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the "Study / Population / Finding" table on asymptomatic
// imaging findings to the "When to image — and why 'not yet' is a defensible
// answer" subsection of the Rotator cuff tendinopathy page. Placed by content
// anchors, one transaction, skipped if already there. POST {dryRun:true}
// reports the plan without writing; {at:"end"} puts it at the end of that
// section instead of right under its lead-in paragraph (the default). Remove
// once run.

const MARKER = "Minagawa 2013";
const b = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = ["Study", "Population", "Finding"];
const ROWS = [
  [
    `${b("Teunis 2014")}, pooled data, 30 studies, 6,112 shoulders`,
    "All ages",
    `Rotator cuff abnormality in ${b("9.7%")} at ≤20 years rising to ${b("62%")} at ≥80 — and the ${b("same age trend whether or not people had symptoms")}`,
  ],
  [
    `${b("Minagawa 2013")}, village mass-screening, 664 residents`,
    "General population",
    `Full-thickness tear in ${b("22.1%")} (147/664). Of those tears, ${b("65.3% were asymptomatic")} — asymptomatic tears were twice as common as symptomatic ones`,
  ],
  [
    `${b("Girish 2011")}, ultrasound, 51 asymptomatic men aged 40–70`,
    "No shoulder symptoms at all",
    `${b("96%")} had at least one abnormality — bursal thickening 78%, AC joint OA 65%, supraspinatus tendinosis 39%, partial-thickness tear 22%`,
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
  const { dryRun, at } = (await req.json().catch(() => ({}))) as { dryRun?: boolean; at?: "lead" | "end" };
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

    const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) >= 2 && level(r) <= 3 && /when to image/i.test(strip(r.content_config?.text)));
    if (hits.length !== 1) throw new Error(`expected one matching heading, found ${hits.length}: ${hits.map((x) => preview(x.r)).join(" | ")}`);
    const h = hits[0].i;
    const hl = level(rows[h]);
    let next = rows.findIndex((r, i) => i > h && level(r) <= hl);
    if (next < 0) next = rows.length;
    // right under the paragraph that makes the claim this table evidences
    const claim = rows.slice(h + 1, next).find((r) => r.block_type === "paragraph" && /tendon abnormality is close to a normal finding/i.test(strip(r.content_config?.body)));
    if (!claim) throw new Error("claim paragraph not found in the section");
    const anchor = claim;
    const plan = { section: rows.slice(h, next).map(preview), nextHeading: rows[next] ? preview(rows[next]) : null, insertAfterPosition: anchor.position, insertAfter: preview(anchor) };

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
