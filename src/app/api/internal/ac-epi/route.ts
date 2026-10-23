import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the epidemiological features table (Epidemiological
// feature / Key findings) to the "Epidemiology and risk factors" section of the
// Adhesive Capsulitis page, at the start of the section (before its first
// subsection, after any intro text). Placed by content anchors, one
// transaction, skipped if already there. POST {dryRun:true} reports the plan
// without writing. Remove once run.

const MARKER = "Epidemiological feature";
const b = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = [MARKER, "Key findings"];
const ROWS = [
  [
    b("Prevalence"),
    "Traditionally estimated at 2–5% of the general population, although this frequently quoted figure is based on limited evidence and varies with diagnostic criteria and study population",
  ],
  [b("Peak age"), "Approximately 40–60 years"],
  [b("Sex"), "More commonly reported in women, although the magnitude of the difference varies"],
  [b("Diabetes"), "One of the strongest and most consistently identified risk factors"],
  [b("Bilateral involvement"), "May occur simultaneously or sequentially; sequential contralateral involvement is more typical"],
  [b("Recurrence"), "Recurrence in the same shoulder after recovery appears uncommon, but robust estimates are limited"],
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
      `SELECT d.id FROM disease d JOIN topic t ON t.id = d.topic_id WHERE t.name = 'Shoulder' AND lower(d.canonical_name) = 'adhesive capsulitis'`
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

    const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) >= 1 && level(r) <= 2 && /epidemiology and risk factors/i.test(strip(r.content_config?.text)));
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
