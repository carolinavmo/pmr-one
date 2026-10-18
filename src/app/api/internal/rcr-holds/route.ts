import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the isometric holds table (Hold / Set-up) to the "loading"
// sub-subsection of the "Stage 1 — … Settle and activate" subsection of the
// Rotator cuff tendinopathy page. Placed by content anchors, one transaction,
// skipped if already there. POST {dryRun:true} reports the plan without
// writing. Remove once run.

const MARKER = "the workhorse";
const b = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = ["Hold", "Set-up"];
const ROWS = [
  [`${b("External rotation at 0°")} — <em>${MARKER}</em>`, `Side-on to wall, elbow at 90°, ${b("folded towel between elbow and ribs")}, back of wrist against wall, press outward`],
  [b("Internal rotation at 0°"), "Same set-up reversed — palm against the doorframe, press inward"],
  [b("Abduction at 0–30°"), "Painful side to the wall, arm at side or slightly lifted, press the outer arm outward"],
  [b("Flexion"), "Facing the wall, fist or palm at waist or chest height, press forward"],
  [b("Extension"), "Back to the wall, arm at side, press backward"],
  [b("Scaption hold"), `Arm in the scapular plane, thumb up, held still ${b("below ~60°")}, unweighted or light`],
  [b("Isometric low row"), "Elbow at side, pressing backward into a wall or fixed band, scapula set"],
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
    // the "loading" sub-subsection inside the stage-1 subsection; table goes right
    // under its lead-in paragraph (or the heading itself when it has none)
    const sec = rows.slice(h + 1, next);
    const subs = sec.filter((r) => r.block_type === "subsubsection_heading" && /loading/i.test(strip(r.content_config?.text)));
    if (subs.length !== 1) throw new Error(`expected one 'loading' sub-subsection, found ${subs.length}; headings in section: ${sec.filter((r) => level(r) === 3).map(preview).join(" | ")}`);
    const subIx = sec.indexOf(subs[0]);
    const lead = sec[subIx + 1];
    const anchor = lead && lead.block_type === "paragraph" ? lead : subs[0];
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
