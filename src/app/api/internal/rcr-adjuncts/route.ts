import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds two guideline tables to the "Adjuncts and procedures"
// section of the Rotator cuff tendinopathy page: the overall recommendations
// table (Intervention / Recommendation / Grade / Rec no.) at the start of the
// section, and the injection recommendations table (Injection / Recommendation
// / Grade) in the "Corticosteroid injection" subsection. Placed by content
// anchors, one transaction, each skipped if already there. POST {dryRun:true}
// reports the plan without writing. Remove once run.

const b = (t: string) => `<strong>${t}</strong>`;

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

interface Job {
  name: string;
  marker: string;
  columns: string[];
  rows: string[][];
  // returns the block the new table goes directly after
  locate: (rows: Row[]) => Row;
}

const findHeading = (rows: Row[], re: RegExp, minLevel: number, maxLevel: number) => {
  const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) >= minLevel && level(r) <= maxLevel && re.test(strip(r.content_config?.text)));
  if (hits.length !== 1) throw new Error(`expected one heading matching ${re}, found ${hits.length}: ${hits.map((x) => preview(x.r)).join(" | ")}`);
  const h = hits[0].i;
  let next = rows.findIndex((r, i) => i > h && level(r) <= level(rows[h]));
  if (next < 0) next = rows.length;
  return { h, next, sec: rows.slice(h + 1, next) };
};

const JOBS: Job[] = [
  {
    name: "guideline recommendations (section 12)",
    marker: "Active exercise programme as initial treatment",
    columns: ["Intervention", "Recommendation", "Grade", "Rec no."],
    rows: [
      [b("Active exercise programme as initial treatment"), "Should prescribe", b("A"), "25"],
      [b("Patient-centred education"), "Should provide", "C", "24"],
      [`${b("Manual therapy")} (spinal and/or upper limb, alone or with exercise)`, "May perform", b("B"), "26"],
      [`${b("Taping")}, added to active rehabilitation`, "May use — short term", "D", "27"],
      [`${b("Acupuncture")}, added to active rehabilitation`, "May use or recommend", "C", "28"],
      [b("ESWT — non-calcific"), `Should ${b("not")} use`, "C", "29"],
      [b("ESWT — calcific"), "May use or recommend", "C", "30"],
      [`${b("Laser — calcific")}, alone or added to rehabilitation`, "May use", "C", "31"],
      [b("Therapeutic ultrasound — calcific"), `Should ${b("not")} use`, "C", "32"],
      [b("Therapeutic ultrasound — non-calcific"), `Should ${b("not")} use`, b("B"), "33"],
      [`${b("Ergonomic adaptations")} — occupational shoulder pain`, "May perform or recommend", "C", "34"],
    ],
    // start of the section: right before its first subsection (after any intro text)
    locate: (rows) => {
      const { h, sec } = findHeading(rows, /adjuncts and procedures/i, 1, 2);
      const firstSub = sec.findIndex((r) => level(r) >= 2 && level(r) <= 3);
      return firstSub < 0 ? (sec.length ? sec[sec.length - 1] : rows[h]) : firstSub === 0 ? rows[h] : sec[firstSub - 1];
    },
  },
  {
    name: "injection recommendations (Corticosteroid injection)",
    marker: "Corticosteroid as first-line",
    columns: ["Injection", "Recommendation", "Grade"],
    rows: [
      [`${b("Corticosteroid")} — pain and short-term disability`, "May recommend or perform", b("B")],
      [b("Corticosteroid as first-line"), `Should ${b("not")}`, "C"],
      [`${b("Ultrasound guidance")} for subacromial corticosteroid, if available`, "Should use", b("B")],
    ],
    // right after the guideline-position evidence card when it is there, else under the heading
    locate: (rows) => {
      const { h, sec } = findHeading(rows, /corticosteroid injection/i, 2, 2);
      const card = sec.find((r) => r.block_type === "highlight_card" && /guideline/i.test(strip(r.content_config?.text)) && /grade/i.test(strip(r.content_config?.text)));
      return card ?? rows[h];
    },
  },
];

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
      const anchor = job.locate(rows);
      const plan = { job: job.name, insertAfterPosition: anchor.position, insertAfter: preview(anchor) };
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
