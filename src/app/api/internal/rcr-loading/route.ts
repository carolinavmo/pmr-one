import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds two tables to the Rotator cuff tendinopathy page, each at
// the end of its own heading: "Loading pattern / Potential tendon response"
// under "Why does loading sometimes produce symptoms instead of adaptation?",
// and "Domain / Key questions" under "History and Symptoms". Placed by content
// anchors, one transaction, each skipped if already there. POST {dryRun:true}
// reports the plan without writing. Remove once run.

const s = (t: string) => `<strong>${t}</strong>`;

interface Job {
  name: string;
  marker: string;
  heading: RegExp;
  columns: string[];
  rows: string[][];
}

const JOBS: Job[] = [
  {
    name: "loading patterns",
    marker: "Appropriate, progressive loading",
    heading: /why does loading sometimes produce symptoms/i,
    columns: ["Loading pattern", "Potential tendon response"],
    rows: [
      [s("Appropriate, progressive loading"), "Supports matrix maintenance and may promote beneficial adaptation over time."],
      [s("Insufficient loading or prolonged unloading"), "May reduce tendon mechanical properties and muscle–tendon capacity."],
      [s("Abrupt or excessive loading"), "May provoke symptoms and contribute to maladaptive matrix responses, particularly when recovery is insufficient."],
      [s("Repeated loading with adequate recovery"), "Allows ongoing tissue remodeling and adaptation to functional demands."],
    ],
  },
  {
    name: "history domains",
    marker: "Relevant health factors",
    heading: /^history and symptoms$/i,
    columns: ["Domain", "Key questions"],
    rows: [
      [s("Onset"), "Gradual or sudden? Any trauma?"],
      [s("Pain location"), "Anterolateral shoulder, neck, or pain extending below the elbow?"],
      [s("Loading history"), "Recent changes in work, exercise, lifting, or overhead activity?"],
      [s("Aggravating movements"), "Reaching, lifting, rotation, or sustained positions?"],
      [s("Night symptoms"), "Pain when lying on the shoulder? Sleep disruption?"],
      [s("Weakness"), "Pain-limited movement or genuine loss of strength?"],
      [s("Functional impact"), "Difficulties with dressing, work, sport, or daily activities?"],
      [s("Previous treatment"), "Response to exercise, medication, injections, or activity modification?"],
      [s("Relevant health factors"), "Diabetes, smoking, previous shoulder pathology, or systemic illness?"],
    ],
  },
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
const bare = (r: Row) => strip(r.content_config?.text).replace(/^\d+(\.\d+)*[.)]?\s+/, "");

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(
      `SELECT d.id FROM disease d JOIN topic t ON t.id = d.topic_id WHERE t.name = 'Shoulder' AND lower(d.canonical_name) = 'rotator cuff tendinopathy'`
    );
    if (d.length !== 1) throw new Error(`expected one page, found ${d.length}`);
    const diseaseId = d[0].id;

    const results: Record<string, unknown>[] = [];
    for (const job of JOBS) {
      const { rows } = await client.query<Row>(
        `SELECT position, block_type::text AS block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position FOR UPDATE`,
        [diseaseId]
      );
      const already = rows.find((r) => r.block_type === "comparison_table" && JSON.stringify(r.content_config).includes(job.marker));
      if (already) {
        results.push({ job: job.name, skipped: `already present at position ${already.position}` });
        continue;
      }
      const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) >= 2 && level(r) <= 3 && job.heading.test(bare(r)));
      if (hits.length !== 1) throw new Error(`${job.name}: expected one matching heading, found ${hits.length}: ${hits.map((x) => preview(x.r)).join(" | ")}`);
      const h = hits[0].i;
      const hl = level(rows[h]);
      let next = rows.findIndex((r, i) => i > h && level(r) <= hl);
      if (next < 0) next = rows.length;
      const anchor = rows[next - 1];
      const plan = { job: job.name, section: rows.slice(h, next).map(preview), nextHeading: rows[next] ? preview(rows[next]) : null, insertAfterPosition: anchor.position };
      if (dryRun) {
        results.push(plan);
        continue;
      }
      await client.query(`UPDATE editorial_block SET position = -(position + 1) WHERE disease_id = $1 AND position > $2`, [diseaseId, anchor.position]);
      await client.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1 AND position < 0`, [diseaseId]);
      const { rows: ins } = await client.query<{ id: string }>(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, 'comparison_table', $3) RETURNING id`,
        [diseaseId, anchor.position + 1, JSON.stringify({ columns: job.columns, rows: job.rows })]
      );
      results.push({ ...plan, inserted: ins[0].id });
    }

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, results });
    }
    await client.query("COMMIT");
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
