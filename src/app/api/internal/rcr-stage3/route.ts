import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the "Exercise / Note" table and the "Training variable / Progression" table to the "Main goals"
// sub-subsection of the "Stage 3 — range, position and complexity" subsection
// of the Rotator cuff tendinopathy page. Placed by content anchors, one
// transaction, skipped if already there. POST {dryRun:true} reports the plan
// without writing; {at:"heading"|"lead"|"end"} chooses the spot inside that
// sub-subsection (default "lead": under its lead-in paragraph, or the heading
// when it has none). Remove once run.

const MARKER = "Keep this in";
const b = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = ["Exercise", "Note"];
const ROWS = [
  [`${b("Overhead press")} — barbell or dumbbell`, "The target task, now loaded. Ribs down, no lumbar arch to fake range"],
  [b("External rotation at 90° abduction"), `Heavier, cable or dumbbell. ${b(MARKER)} — it is the specific deficit, and no compound lift trains it`],
  [`${b("Row")} — barbell, dumbbell, heavy cable`, "Full scapular travel, initiated from the scapula"],
  [b("Pull-down → pull-up progression"), "Loaded overhead pulling; eccentric-emphasis pull-ups are excellent here"],
  [b("Bench or incline press"), "Horizontal pushing under real load, cuff working as stabiliser"],
  [b("Loaded carries"), `Farmer’s, suitcase, and ${b("overhead carry")} — sustained cuff demand with a vertical load`],
  [b("Scaption / lateral raise"), "Heavier, through full range, controlled descent"],
];

const MARKER2 = "Isolated → integrated, multiplanar movements";
const COLUMNS2 = ["Training variable", "Progression"];
const ROWS2 = [
  [b("Resistance"), "Moderate → heavier loads"],
  [b("Repetitions"), "Higher repetitions for endurance; lower repetitions with greater resistance for strength"],
  [b("Shoulder position"), "Arm at side → elevated → overhead"],
  [b("Lever arm"), "Shorter → longer, as appropriate"],
  [b("Movement speed"), "Slow and controlled → faster, task-specific"],
  [b("Complexity"), MARKER2],
  [b("Work capacity"), "Increase repetitions, duration, or total workload"],
];
const TABLES = [
  { marker: MARKER, columns: COLUMNS, rows: ROWS },
  { marker: MARKER2, columns: COLUMNS2, rows: ROWS2 },
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
  const { dryRun, at } = (await req.json().catch(() => ({}))) as { dryRun?: boolean; at?: "heading" | "lead" | "end" };
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

    const todo = TABLES.filter((t) => !rows.some((r) => r.block_type === "comparison_table" && JSON.stringify(r.content_config).includes(t.marker)));
    if (todo.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "both tables already present" });
    }

    const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) >= 2 && level(r) <= 3 && /stage 3/i.test(strip(r.content_config?.text)));
    if (hits.length !== 1) throw new Error(`expected one matching heading, found ${hits.length}: ${hits.map((x) => preview(x.r)).join(" | ")}`);
    const h = hits[0].i;
    const hl = level(rows[h]);
    let next = rows.findIndex((r, i) => i > h && level(r) <= hl);
    if (next < 0) next = rows.length;
    // the "How to progress" sub-subsection inside the stage-2 subsection; table goes
    // right under its lead-in paragraph (or the heading itself when it has none)
    const sec = rows.slice(h + 1, next);
    const subs = sec.filter((r) => r.block_type === "subsubsection_heading" && /main goals/i.test(strip(r.content_config?.text)));
    if (subs.length !== 1) throw new Error(`expected one 'Main goals' sub-subsection, found ${subs.length}; headings in section: ${sec.filter((r) => level(r) === 3).map(preview).join(" | ")}`);
    const subIx = sec.indexOf(subs[0]);
    let subEnd = sec.findIndex((r, i) => i > subIx && level(r) <= 3);
    if (subEnd < 0) subEnd = sec.length;
    const lead = sec[subIx + 1];
    const anchor = at === "end" ? sec[subEnd - 1] : at === "heading" ? subs[0] : lead && lead.block_type === "paragraph" ? lead : subs[0];
    const plan = { section: rows.slice(h, next).map(preview), nextHeading: rows[next] ? preview(rows[next]) : null, insertAfterPosition: anchor.position, insertAfter: preview(anchor) };

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }

    await client.query(`UPDATE editorial_block SET position = -(position + $3) WHERE disease_id = $1 AND position > $2`, [diseaseId, anchor.position, todo.length]);
    await client.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1 AND position < 0`, [diseaseId]);
    const ids: string[] = [];
    for (let k = 0; k < todo.length; k++) {
      const { rows: ins } = await client.query<{ id: string }>(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, 'comparison_table', $3) RETURNING id`,
        [diseaseId, anchor.position + 1 + k, JSON.stringify({ columns: todo[k].columns, rows: todo[k].rows })]
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
