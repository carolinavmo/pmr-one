import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds two guideline tables to the "Adjuncts and procedures"
// section of the Rotator cuff tendinopathy page: the overall recommendations
// table (Intervention / Recommendation / Grade / Rec no.) at the start of the
// section, the "Finding / %" prevalence table in "When to image", the Cochrane reviews table in the "Cochrane" subsection, and the injection recommendations table (Injection / Recommendation
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
  caption?: string;
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
    name: "prevalence of abnormality (When to image)",
    marker: "595/602",
    columns: ["Finding", "%"],
    rows: [
      [b("Any rotator cuff abnormality"), `${b("98.7%")} (595/602)`],
      ["Tendinopathy as most severe finding", "25.3%"],
      ["Partial-thickness tear", "62.4%"],
      ["Full-thickness tear", "11.1%"],
      [b("Normal"), b("1.3%")],
    ],
    // right after the Study / Population / Finding table in that subsection, else under the claim paragraph, else under the heading
    locate: (rows) => {
      const { h, sec } = findHeading(rows, /when to image/i, 2, 2);
      const studies = sec.find((r) => r.block_type === "comparison_table" && JSON.stringify(r.content_config).includes("Minagawa 2013"));
      if (studies) return studies;
      const claim = sec.find((r) => r.block_type === "paragraph" && /tendon abnormality is close to a normal finding/i.test(strip(r.content_config?.body)));
      return claim ?? rows[h];
    },
  },
  {
    name: "Cochrane reviews",
    marker: "Karjalainen 2019",
    caption: "Cochrane reviews — current and central",
    columns: ["Review", "The question", "What it found", "Take-home"],
    rows: [
      [
        `${b("Subacromial decompression")}<br>Karjalainen 2019`,
        `Does the operation beat a ${b("placebo operation")}?`,
        `${b("No.")} No clinically important difference in pain, function or quality of life at one year — and this is ${b("high-certainty")} evidence, the strongest in the whole condition`,
        "The operation does not work. This is the finding that dismantled the impingement model",
      ],
      [
        `${b("Surgery for rotator cuff tears")}<br>Karjalainen 2019`,
        "Does repairing a tear beat exercise?",
        `Probably ${b("little or no meaningful benefit")} over exercise with or without injection. ${b("No placebo-surgery trial has ever been done")}`,
        `Applies to ${b("small degenerative")} tears — not traumatic or large ones. Useful when a patient asks why they aren’t being operated on`,
      ],
      [
        `${b("Shock wave therapy")}<br>Surace 2020`,
        "Does it help, and does calcium make a difference?",
        `Benefits are ${b("real but too small to matter clinically")}, and ${b("no better in calcific than non-calcific disease")}. Adverse events were about three times more common than with placebo`,
        `Weakens the usual “shockwave is for calcific disease” line. In calcific disease, ${b("lavage is the better-supported option")}`,
      ],
      [
        `${b("Manual therapy and exercise")}<br>Page 2016`,
        "Does the combination beat placebo?",
        `${b("No clinically important difference")} in any outcome — a small function advantage at best. Mild adverse events were markedly more common`,
        "Keep it as a short-term symptom tool that makes loading possible. Not a substantial intervention in its own right",
      ],
      [
        `${b("Electrotherapy modalities")}<br>Page 2016`,
        "Do ultrasound, laser, TENS and similar add anything?",
        `${b("Added to exercise, they add nothing of clinical importance.")} No benefit for PEMF, microcurrent, iontophoresis or diathermy; TENS evidence too weak to judge`,
        b("The one sentence that answers nearly every adjunct question"),
      ],
      [
        `${b("Imaging accuracy")}<br>Lenza`,
        "Which modality detects a tear best?",
        `For ${b("full-thickness")} tears, ultrasound, MRI and MR arthrography perform ${b("equally well")}. For partial-thickness tears, ${b("none of them perform well")}`,
        "Choose on cost, access and what else you need to see. Ultrasound first",
      ],
    ],
    // under the subsection's lead-in paragraph (or the heading when it has none)
    locate: (rows) => {
      const { h, sec } = findHeading(rows, /cochrane/i, 2, 3);
      return sec[0] && sec[0].block_type === "paragraph" ? sec[0] : rows[h];
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
        [diseaseId, anchor.position + 1, JSON.stringify({ columns: job.columns, rows: job.rows, ...(job.caption ? { caption: job.caption } : {}) })]
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
