import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the guideline recommendations table (Intervention /
// Recommendation / Grade / Rec no.) to the "Adjuncts and procedures" section
// of the Rotator cuff tendinopathy page, at the start of the section (before
// its first subsection). Placed by content anchors, one transaction, skipped
// if already there. POST {dryRun:true} reports the plan without writing.
// Remove once run.

const MARKER = "Active exercise programme as initial treatment";
const b = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = ["Intervention", "Recommendation", "Grade", "Rec no."];
const ROWS = [
  [b(MARKER), "Should prescribe", b("A"), "25"],
  [b("Patient-centred education"), "Should provide", "C", "24"],
  [`${b("Manual therapy")} (spinal and/or upper limb, alone or with exercise)`, "May perform", b("B"), "26"],
  [`${b("Taping")}, added to active rehabilitation`, "May use — short term", "D", "27"],
  [`${b("Acupuncture")}, added to active rehabilitation`, "May use or recommend", "C", "28"],
  [b("ESWT — non-calcific"), `Should ${b("not")} use`, "C", "29"],
  [b("ESWT — calcific"), "May use or recommend", "C", "30"],
  [`${b("Laser — calcific")}, alone or added to rehabilitation`, "May use", "C", "31"],
  [b("Therapeutic ultrasound — calcific"), `Should ${b("not")} use`, "C", "32"],
  [b("Therapeutic ultrasound — non-calcific"), `Should ${b("not")} use`, b("B"), "33"],
  [`${b("Ergonomic adaptations")} — occupational shoulder pain`, "May perform or recommend", "C", "34"],
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

    const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) >= 1 && level(r) <= 2 && /adjuncts and procedures/i.test(strip(r.content_config?.text)));
    if (hits.length !== 1) throw new Error(`expected one matching heading, found ${hits.length}: ${hits.map((x) => preview(x.r)).join(" | ")}`);
    const h = hits[0].i;
    const hl = level(rows[h]);
    let next = rows.findIndex((r, i) => i > h && level(r) <= hl);
    if (next < 0) next = rows.length;
    // start of the section: right before its first subsection (after any intro text)
    const sec = rows.slice(h + 1, next);
    const firstSub = sec.findIndex((r) => level(r) >= 2 && level(r) <= 3);
    const anchor = firstSub < 0 ? (sec.length ? sec[sec.length - 1] : rows[h]) : firstSub === 0 ? rows[h] : sec[firstSub - 1];
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
