import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the imaging-modalities comparison table (Modality / What it
// answers well / Blind spots / Practicalities / Choose it when) to the
// "Modalities" subsection of the Rotator cuff tendinopathy page. Placed by
// content anchors, one transaction, skipped if already there. POST
// {dryRun:true} reports the plan without writing; {at:"end"} puts it at the
// end of that section instead of right under its lead-in paragraph (the
// default). Remove once run.

const MARKER = "Choose it when";
const b = (t: string) => `<strong>${t}</strong>`;
const COLUMNS = ["Modality", "What it answers well", "Blind spots", "Practicalities", MARKER];
const ROWS = [
  [
    `${b("Plain radiographs")} — true AP (Grashey), axillary, scapular-Y/outlet`,
    `Calcific deposits · glenohumeral and AC osteoarthritis · ${b("acromiohumeral interval")} · os acromiale · fracture, dislocation, bone lesion · acromial morphology`,
    `${b("Nothing about tendon.")} Normal film does not exclude anything soft-tissue`,
    "Cheap, universal, minutes",
    "First study in almost any shoulder you are imaging at all — especially sudden severe pain (calcific), older patients, trauma, or before considering surgery",
  ],
  [
    b("Ultrasound"),
    `${b("Full-thickness tears")} · calcific deposits · bursal thickening and effusion · biceps long head subluxation/rupture · ${b("dynamic assessment during movement")} · ${b("immediate side-to-side comparison")} · guides injection in the same sitting`,
    "Labrum · articular cartilage · bone and marrow · deep/intra-articular structures · large body habitus",
    `Cheap, fast, no radiation, repeatable. ${b("Heavily operator-dependent")} — accuracy tracks the sonographer's experience`,
    `${b("Default first-line soft-tissue study.")} The question is “is there a full-thickness tear?” and you have a competent operator`,
  ],
  [
    b("MRI (non-contrast)"),
    `Everything ultrasound does, plus ${b("muscle atrophy and fatty infiltration")} (Goutallier/Fuchs, tangent sign) · tear size and retraction · labrum · marrow oedema · AC and glenohumeral joint · nerve and mass lesions`,
    "Over-sensitive to incidental findings. Poorer in large patients with surface-coil limitations",
    "Expensive, waiting lists, contraindications (certain implants), claustrophobia",
    `${b("Surgical planning")} · wide differential · suspected labral, neurological or sinister pathology · ultrasound equivocal or unavailable to standard`,
  ],
  [
    b("MR arthrography"),
    `${b("Partial-thickness articular-sided tears")} · labral pathology (SLAP, Bankart) · instability workup`,
    "Invasive; small infection and reaction risk; no advantage over plain MRI for full-thickness tears",
    "Costs more, takes longer, needs an injection",
    `Young patient, instability or labral question. ${b("Not")} for routine tendinopathy`,
  ],
  [
    b("CT / CT arthrography"),
    `Bone detail · glenoid bone loss · fatty infiltration (Goutallier's original substrate) · ${b("full-thickness tears when MRI is contraindicated")}`,
    "Radiation; inferior soft-tissue contrast; arthrography is invasive",
    "Fast, widely available",
    "MRI contraindicated or not tolerated; complex bone or revision planning",
  ],
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

    const hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => level(r) >= 2 && level(r) <= 3 && /modalities/i.test(strip(r.content_config?.text)));
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
