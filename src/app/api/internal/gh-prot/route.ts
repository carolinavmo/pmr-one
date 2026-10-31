import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the anatomic vs reverse TSA "what needs protection" table
// to the "Understanding what needs protection" heading inside the 15th section
// of the Glenohumeral Osteoarthritis page. POST {dryRun:true} lists that heading's blocks and the
// default spot (after its last block); POST {afterPosition:N} inserts after
// that block, which must be inside the section. One transaction; a table
// already on the page (matched by a row label) is skipped. Remove once run.

const b = (t: string) => `<strong>${t}</strong>`;
const TABLES: { marker: string; columns: string[]; rows: string[][] }[] = [
  {
    marker: "Improvement in active elevation; rotational recovery may be less predictable",
    columns: ["", "Anatomic TSA", "Reverse TSA"],
    rows: [
      [b("Main consideration"), "Healing subscapularis repair, when performed", "Prosthetic stability and deltoid/acromial loading"],
      [b("Primary muscular dependence"), "Rotator cuff and deltoid", "Deltoid, with contribution from remaining cuff"],
      [b("Early precautions"), "Limit external rotation; avoid active/resisted internal rotation and reaching behind the back", "Avoid positions that increase instability risk, particularly combined extension, adduction, and internal rotation"],
      [b("Strengthening emphasis"), "Progressive rotator cuff, deltoid, and scapular strengthening", "Deltoid, scapular stabilizers, and remaining rotator cuff"],
      [b("Functional expectations"), "Restoration of pain-free movement and useful rotation", "Improvement in active elevation; rotational recovery may be less predictable"],
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
    if (sections.length < 15) throw new Error(`expected at least 15 sections, found ${sections.length}`);
    const s12 = sections[14].i;
    const s12End = sections[15] ? sections[15].i : rows.length;
    const hits = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) => i > s12 && i < s12End && level(r) <= 3 && /^understanding what needs protection/i.test(strip(r.content_config?.text)));
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
