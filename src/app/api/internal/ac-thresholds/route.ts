import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the diagnostic thresholds table (Criterion / Proposed
// threshold / Interpretation) to the "Diagnostic thresholds — and why none of
// them is a rule" heading of the Adhesive Capsulitis page. POST {dryRun:true}
// lists that heading's blocks and the default spot (after its last block);
// POST {afterPosition:N} inserts after that block, which must be inside the
// section. One transaction, skipped if already there. Remove once run.

const MARKER = "Proposed threshold";
const b = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = ["Criterion", MARKER, "Interpretation"];
const ROWS = [
  [b("Passive external rotation"), "Less than 30°", "Commonly used in clinical studies to identify substantial restriction"],
  [b("External rotation compared with opposite shoulder"), "Greater than 50% loss", "Suggests marked asymmetrical restriction"],
  [b("Restriction in multiple planes"), "Greater than 25% loss in at least two directions", "Used in some clinical definitions of frozen shoulder"],
  [b("Passive ROM compared with opposite shoulder"), "At least 50% reduction in two or more planes", "A stricter criterion used in some research settings"],
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
  `${r.position} L${level(r)} ${r.block_type}: ${strip(r.content_config?.text ?? r.content_config?.body ?? r.content_config?.label ?? (r.block_type === "comparison_table" ? JSON.stringify(r.content_config?.columns) : "")).slice(0, 80)}`;

export async function POST(req: NextRequest) {
  const { dryRun, afterPosition } = (await req.json().catch(() => ({}))) as { dryRun?: boolean; afterPosition?: number };
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

    const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) === 3 && /^diagnostic thresholds/i.test(strip(r.content_config?.text)));
    if (hits.length !== 1) throw new Error(`expected one matching heading, found ${hits.length}: ${hits.map((x) => preview(x.r)).join(" | ")}`);
    const h = hits[0].i;
    const hl = level(rows[h]);
    let next = rows.findIndex((r, i) => i > h && level(r) <= hl);
    if (next < 0) next = rows.length;
    const sec = rows.slice(h, next);
    const anchor = afterPosition == null ? sec[sec.length - 1] : sec.find((r) => r.position === afterPosition);
    if (!anchor) throw new Error(`position ${afterPosition} is not inside the section`);
    const plan = {
      section: sec.map(preview),
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
