import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the rehabilitation phases table (Phase / Main objective /
// Exercise focus / Approximate timeframe) plus its explanatory note to the
// "What the evidence does and does not say" subsection of the Rotator cuff
// tendinopathy page. Placed by content anchors, one transaction, skipped if
// already there. POST {dryRun:true} reports the plan without writing;
// {at:"end"} puts it at the end of that section instead of right under its
// lead-in paragraph (the default). Remove once run.

const MARKER = "Improve load tolerance, endurance, and overhead capacity";
const COLUMNS = ["Phase", "Main objective", "Exercise focus", "Approximate timeframe"];
const ROWS = [
  ["1. Initial loading", "Control symptoms and establish tolerable loading", "Isometrics, light resistance, comfortable ROM", "Weeks 0–2"],
  ["2. Progressive strengthening", "Improve rotator cuff and scapular muscle strength", "Isotonic resistance, controlled elevation", "Weeks 2–6"],
  ["3. Advanced strengthening", MARKER, "Heavier resistance, longer lever arms, overhead loading", "Weeks 6–12"],
  ["4. Return to activity", "Restore occupational or sporting demands", "Task-specific loading, endurance, power when relevant", "Week 12 onward"],
];
const NOTE =
  "<p>These timeframes are illustrative, not validated recovery milestones. Patients with low irritability may begin progressive strengthening immediately, while more irritable presentations may require a slower progression. Phases can overlap.</p>";
const NEW_BLOCKS: { type: string; content: Record<string, unknown> }[] = [
  { type: "comparison_table", content: { columns: COLUMNS, rows: ROWS } },
  { type: "paragraph", content: { body: NOTE } },
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

    const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) >= 2 && level(r) <= 3 && /what the evidence does and does not say/i.test(strip(r.content_config?.text)));
    if (hits.length !== 1) throw new Error(`expected one matching heading, found ${hits.length}: ${hits.map((x) => preview(x.r)).join(" | ")}`);
    const h = hits[0].i;
    const hl = level(rows[h]);
    let next = rows.findIndex((r, i) => i > h && level(r) <= hl);
    if (next < 0) next = rows.length;
    const lead = rows[h + 1];
    const anchor = at === "end" ? rows[next - 1] : lead && lead.block_type === "paragraph" ? lead : rows[h];
    const plan = { section: rows.slice(h, next).map(preview), nextHeading: rows[next] ? preview(rows[next]) : null, insertAfterPosition: anchor.position, insertAfter: preview(anchor) };

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }

    await client.query(`UPDATE editorial_block SET position = -(position + $3) WHERE disease_id = $1 AND position > $2`, [diseaseId, anchor.position, NEW_BLOCKS.length]);
    await client.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1 AND position < 0`, [diseaseId]);
    const ids: string[] = [];
    for (let k = 0; k < NEW_BLOCKS.length; k++) {
      const { rows: ins } = await client.query<{ id: string }>(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, $3::editorial_block_type, $4) RETURNING id`,
        [diseaseId, anchor.position + 1 + k, NEW_BLOCKS[k].type, JSON.stringify(NEW_BLOCKS[k].content)]
      );
      ids.push(ins[0].id);
    }
    await client.query("COMMIT");
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, inserted: ids, plan });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
