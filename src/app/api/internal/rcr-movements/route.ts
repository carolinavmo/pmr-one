import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the stage-1 movements table (Movement / Set-up / Notes) to
// the "Stage 1 — … Settle and activate" subsection of the Rotator cuff
// tendinopathy page, directly under the stage's Component / Prescription
// table. Placed by content anchors, one transaction, skipped if already
// there. POST {dryRun:true} reports the plan without writing. Remove once run.

const MARKER = "Trunk bent forward, arm hanging";
const b = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = ["Movement", "Set-up", "Notes"];
const ROWS = [
  [b("Pendulum (Codman)"), `${MARKER}, small circles and swings driven by trunk sway`, "For the most irritable only. Low value otherwise"],
  [
    b("Supine active-assisted elevation"),
    "Lying down, stick or good hand lifting the bad arm",
    `${b("The most useful starting point.")} Trunk supported, gravity partly eliminated, minimal deltoid demand`,
  ],
  [b("Supine assisted ER"), "Lying down, elbow at side on a folded towel, stick pushing the forearm outward", "Keeps rotation range without loading"],
  [b("Table or wall slides"), "Hand on a towel on a table, or on the wall; slide forward and sideways", "Partial weight support, easy to grade by how far they lean"],
  [b("Wall walk / finger ladder"), "Fingers walk up the wall in scaption", "Self-limiting — they stop where it bites"],
  [b("Active movement in the comfortable arc"), "Unloaded, scapular plane, within range", "The target — progress to this as soon as tolerated"],
  [b("Scapular movement"), "Shrug, retract, protract, depress; slow circles", "Unloaded, keeps the scapula moving"],
  [b("Thoracic mobility"), "Extension over a foam roller or chair back; side-lying open-book rotation", "Free range for the shoulder, no shoulder load"],
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

    const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) >= 2 && level(r) <= 3 && /stage 1.*settle and activate/i.test(strip(r.content_config?.text)));
    if (hits.length !== 1) throw new Error(`expected one matching heading, found ${hits.length}: ${hits.map((x) => preview(x.r)).join(" | ")}`);
    const h = hits[0].i;
    const hl = level(rows[h]);
    let next = rows.findIndex((r, i) => i > h && level(r) <= hl);
    if (next < 0) next = rows.length;
    // just before the "What not to do:" paragraph: what to do first, then what not to do
    const sec = rows.slice(h + 1, next);
    const notIx = sec.findIndex((r) => r.block_type === "paragraph" && strip(r.content_config?.body).toLowerCase().startsWith("what not to do"));
    if (notIx < 1) throw new Error(`'What not to do' paragraph not found after the section start: ${sec.map(preview).join(" | ")}`);
    const anchor = sec[notIx - 1];
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
