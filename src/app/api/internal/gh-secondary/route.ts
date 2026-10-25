import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the secondary GHOA causes table (Cause / Mechanism / What
// it changes) to the "Secondary GHOA" heading of the Glenohumeral Osteoarthritis
// page. POST {dryRun:true} lists that heading's blocks and the default spot
// (after its last block); POST {afterPosition:N} inserts after that block, which
// must be inside the section. One transaction, skipped if already there. Remove
// once run.

const MARKER = "What it changes";
const b = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = ["Cause", "Mechanism", MARKER];
const ROWS = [
  [b("Cuff tear arthropathy"), "Massive tear → lost fulcrum → superior migration → head articulates with acromion", `${b("Reverse")} arthroplasty`],
  [b("Dislocation arthropathy"), "Chondral injury, labral loss, glenoid rim erosion", "Younger patient, possible bone loss"],
  [b("Capsulorrhaphy arthropathy"), "Over-tightened anterior repair → head driven posteriorly", "Severe posterior erosion, difficult glenoid"],
  [b("Post-traumatic"), "Intra-articular fracture, chondral injury, malunion", "Distorted anatomy, retained metal, possible AVN"],
  [b("Avascular necrosis"), "Head collapse → secondary joint destruction", "Glenoid may be preserved early"],
  [b("Inflammatory arthritis"), "Synovial-driven destruction", `${b("Central")} glenoid erosion, poor bone stock, soft tissue compromise`],
  [b("Prior septic arthritis"), "Chondrolysis", "Must exclude ongoing infection before any implant"],
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
      `SELECT d.id FROM disease d WHERE d.canonical_name ILIKE '%glenohumeral osteoarthritis%'`
    );
    if (d.length !== 1) throw new Error(`expected one page, found ${d.length}`);
    const diseaseId = d[0].id;
    const { rows } = await client.query<Row>(
      `SELECT position, block_type::text AS block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position FOR UPDATE`,
      [diseaseId]
    );

    const already = rows.find((r) => r.block_type === "comparison_table" && JSON.stringify(r.content_config?.columns).includes(`"${MARKER}"`));
    if (already) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: `already present at position ${already.position}` });
    }

    const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) <= 3 && /secondary ghoa/i.test(strip(r.content_config?.text)));
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
