import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds a "Key concept" column between "Indication" and "Evidence"
// in the table of 14.2 "Main surgical options" (2nd subsection of the 14th
// section) of the Glenohumeral Osteoarthritis page. POST {dryRun:true} shows
// the table and where the column would go; POST {} applies it. One
// transaction; a table that already has the column is skipped. Remove once run.

const COLUMN = "Key concept";
// In the table's row order: debridement, hemiarthroplasty, aTSA, rTSA.
const CELLS = [
  "Addresses associated pathology and may provide temporary relief without replacing the joint",
  "Replaces the humeral head but leaves the native glenoid",
  "Replaces both articular surfaces while preserving native cuff-dependent biomechanics",
  "Allows the deltoid to become the principal motor for arm elevation",
];
const b = (t: string) => `<strong>${t}</strong>`;
const NEW_TABLE = {
  marker: "Determines whether a glenoid component can be seated and fixed",
  columns: ["Variable", "Why"],
  rows: [
    ["Rotator cuff integrity", `An anatomic replacement ${b("borrows the patient’s own rotators.")} A reverse replacement ${b("substitutes the deltoid")} for them`],
    ["Glenoid morphology", "Determines whether a glenoid component can be seated and fixed — B2 and B3 are the difficult cases"],
  ],
};

interface Row {
  id: string;
  position: number;
  block_type: string;
  content_config: Record<string, unknown> | null;
}
const strip = (v: unknown) => String(v ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const LEVEL: Record<string, number> = { section_heading: 1, subsection_heading: 2, subsubsection_heading: 3 };
const level = (r: Row) => LEVEL[r.block_type] ?? 99;
const preview = (r: Row) => `${r.position} L${level(r)} ${r.block_type}: ${strip(r.content_config?.text ?? r.content_config?.body ?? "").slice(0, 80)}`;

export async function POST(req: NextRequest) {
  const { dryRun, step, afterPosition } = (await req.json().catch(() => ({}))) as { dryRun?: boolean; step?: "column" | "table"; afterPosition?: number };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(`SELECT d.id FROM disease d WHERE d.canonical_name ILIKE '%glenohumeral osteoarthritis%'`);
    if (d.length !== 1) throw new Error(`expected one page, found ${d.length}`);
    const diseaseId = d[0].id;
    const { rows } = await client.query<Row>(
      `SELECT id, position, block_type::text AS block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position FOR UPDATE`,
      [diseaseId]
    );

    const sections = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) === 1);
    if (sections.length < 14) throw new Error(`expected at least 14 sections, found ${sections.length}`);
    const s = sections[13].i;
    const sEnd = sections[14] ? sections[14].i : rows.length;
    const subs = rows.map((r, i) => ({ r, i })).filter(({ r, i }) => i > s && i < sEnd && level(r) === 2);
    if (subs.length < 2) throw new Error(`section 14 has ${subs.length} subsections: ${preview(rows[s])}`);
    const h = subs[1].i;
    let next = rows.findIndex((r, i) => i > h && level(r) <= 2);
    if (next < 0) next = rows.length;
    const tables = rows.slice(h, next).filter((r) => r.block_type === "comparison_table" && !JSON.stringify(r.content_config?.rows).includes(NEW_TABLE.marker));
    if (tables.length !== 1) throw new Error(`expected one table in ${preview(rows[h])}, found ${tables.length}`);
    const t = tables[0];

    if (step === "table") {
      const sec = rows.slice(h, next);
      const present = rows.find((r) => r.block_type === "comparison_table" && JSON.stringify(r.content_config?.rows).includes(NEW_TABLE.marker));
      if (present) {
        await client.query("ROLLBACK");
        return NextResponse.json({ ok: true, skipped: "the table is already on the page" });
      }
      const anchor = afterPosition == null ? sec[sec.length - 1] : sec.find((r) => r.position === afterPosition);
      if (!anchor) throw new Error(`position ${afterPosition} is not inside the section`);
      const tablePlan = { section: sec.map(preview), insertAfter: preview(anchor), nextHeading: rows[next] ? preview(rows[next]) : null };
      if (dryRun) {
        await client.query("ROLLBACK");
        return NextResponse.json({ ok: true, dryRun: true, plan: tablePlan });
      }
      await client.query(`UPDATE editorial_block SET position = -(position + 1) WHERE disease_id = $1 AND position > $2`, [diseaseId, anchor.position]);
      await client.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1 AND position < 0`, [diseaseId]);
      const { rows: ins } = await client.query<{ id: string }>(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, 'comparison_table', $3) RETURNING id`,
        [diseaseId, anchor.position + 1, JSON.stringify({ columns: NEW_TABLE.columns, rows: NEW_TABLE.rows })]
      );
      await client.query("COMMIT");
      revalidatePath("/[locale]/conditions/[slug]", "page");
      return NextResponse.json({ ok: true, inserted: ins[0].id, plan: tablePlan });
    }

    const columns = (t.content_config?.columns as string[]) ?? [];
    const tableRows = (t.content_config?.rows as string[][]) ?? [];
    const plan = {
      section: preview(rows[s]),
      subsection: preview(rows[h]),
      tablePosition: t.position,
      keys: Object.keys(t.content_config ?? {}),
      columns: columns.map(strip),
      rows: tableRows.map((r) => r.map((c) => strip(c).slice(0, 60))),
    };
    if (columns.some((c) => strip(c) === COLUMN)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "the column is already in the table", plan });
    }
    const at = columns.findIndex((c) => strip(c).toLowerCase() === "evidence");
    if (at < 1 || strip(columns[at - 1]).toLowerCase() !== "indication") throw new Error(`Evidence column not directly after Indication: ${JSON.stringify(plan.columns)}`);
    if (tableRows.length !== CELLS.length) throw new Error(`table has ${tableRows.length} rows, expected ${CELLS.length}`);
    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, insertAtIndex: at, plan });
    }

    const next_ = {
      ...t.content_config,
      columns: [...columns.slice(0, at), COLUMN, ...columns.slice(at)],
      rows: tableRows.map((r, i) => [...r.slice(0, at), CELLS[i], ...r.slice(at)]),
    };
    await client.query(`UPDATE editorial_block SET content_config = $2 WHERE id = $1`, [t.id, JSON.stringify(next_)]);
    await client.query("COMMIT");
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, updated: t.id, columns: next_.columns });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
