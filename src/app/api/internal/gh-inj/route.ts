import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the injection status table (Corticosteroid / Hyaluronic
// acid / PRP) to section 13 (the 13th section) of the Glenohumeral
// Osteoarthritis page. POST {dryRun:true} lists that heading's blocks and the
// default spot (after its last block); POST {afterPosition:N} inserts after
// that block, which must be inside the section. One transaction; a table
// already on the page (matched by a row label) is skipped. Remove once run.

const b = (t: string) => `<strong>${t}</strong>`;
const TABLES: { marker: string; columns: string[]; rows: string[][] }[] = [
  {
    marker: "The only one worth using. Real but time-limited benefit",
    columns: ["", "Status"],
    rows: [
      ["Corticosteroid", "The only one worth using. Real but time-limited benefit"],
      ["Hyaluronic acid", "AAOS: STRONG evidence of NO benefit"],
      ["PRP / stem cells", "AAOS: cannot be recommended"],
    ],
  },
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
  const { dryRun, afterPosition, only } = (await req.json().catch(() => ({}))) as { dryRun?: boolean; afterPosition?: number; only?: number };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(
      `SELECT d.id FROM disease d WHERE d.canonical_name ILIKE '%glenohumeral osteoarthritis%'`
    );
    if (d.length !== 1) throw new Error(`expected one page, found ${d.length}`);
    const diseaseId = d[0].id;
    const { rows } = await client.query<Row>(
      `SELECT position, block_type::text AS block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position FOR UPDATE`,
      [diseaseId]
    );

    const present = (marker: string) =>
      rows.find((r) => r.block_type === "comparison_table" && JSON.stringify(r.content_config?.rows).includes(marker));
    const todo = TABLES.filter((t, i) => (only == null || only === i) && !present(t.marker));
    if (todo.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "the table is already on the page" });
    }

    const sections = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) === 1);
    if (sections.length < 13) throw new Error(`expected at least 13 sections, found ${sections.length}`);
    const s12 = sections[12].i;
    const hits = [sections[12]];
    if (hits.length !== 1) throw new Error(`expected one matching heading, found ${hits.length}: ${hits.map((x) => preview(x.r)).join(" | ")}`);
    const h = hits[0].i;
    const hl = level(rows[h]);
    let next = rows.findIndex((r, i) => i > h && level(r) <= hl);
    if (next < 0) next = rows.length;
    const sec = rows.slice(h, next);
    const anchor = afterPosition == null ? sec[sec.length - 1] : sec.find((r) => r.position === afterPosition);
    if (!anchor) throw new Error(`position ${afterPosition} is not inside the section`);
    const plan = {
      parentSection: preview(rows[s12]),
      willAdd: todo.map((t) => t.marker),
      section: sec.map(preview),
      nextHeading: rows[next] ? preview(rows[next]) : null,
      insertAfterPosition: anchor.position,
      insertAfter: preview(anchor),
    };

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }

    const n = todo.length;
    await client.query(`UPDATE editorial_block SET position = -(position + $3) WHERE disease_id = $1 AND position > $2`, [diseaseId, anchor.position, n]);
    await client.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1 AND position < 0`, [diseaseId]);
    const inserted: string[] = [];
    for (const [idx, t] of todo.entries()) {
      const { rows: ins } = await client.query<{ id: string }>(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, 'comparison_table', $3) RETURNING id`,
        [diseaseId, anchor.position + 1 + idx, JSON.stringify({ columns: t.columns, rows: t.rows })]
      );
      inserted.push(ins[0].id);
    }
    await client.query("COMMIT");
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, inserted, plan });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
