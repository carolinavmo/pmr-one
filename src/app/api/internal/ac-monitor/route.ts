import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db";
import content from "./content.json";

// TEMPORARY — adds the "Monitoring load, and what to do in a flare" material
// to the end of the Patient education subsection (11.1) of the Acromioclavicular
// Osteoarthritis page: a heading, a standfirst, two figures as images (PNGs
// shipped in content.json, written to the uploads volume the same way an
// editor upload is, each with its own medical_illustration row), their
// captions, and the evidence note. POST {dryRun:true} lists the subsection and
// the default spot (after its last block); {afterPosition:N} overrides it.
// One transaction; skipped when the figure is already on the page.

const HEADING = "Monitoring load, and what to do in a flare";
const MARKER = "Figure 1 · What the timing of symptoms tells you";

const STANDFIRST =
  "Every decision in this section turns on <strong>one variable: how long symptoms last after the session.</strong> The same pain score means something different during the exercise, the next morning, and two weeks later — and each timescale has its own action.";
const CAPTION1 =
  "Rows 1–3 are <strong>dosing decisions</strong> — the patient makes them alone, and the only consequence is a lighter session. Rows 4–6 are <strong>yours</strong>. The boundary between them is the point of the figure: once symptoms outlast the 24-hour window the question stops being “how much load?” and becomes “is this the right diagnosis?” Pain that <strong>climbs set to set</strong> is the most useful single signal and the one patients never think to watch — a stable 4/10 through a whole session is a tolerable dose; the same 4/10 reaching 7/10 by the last set is not, and both get reported as “about four”.";
const CAPTION2 =
  "The steps are numbered because the order matters: <strong>identifying the cause comes before changing anything</strong>, or the patient de-loads and re-loads blindly and flares again. Give this before the first flare, not during one — a patient who was warned that flares are expected treats one as a dosing problem, while a patient who was not treats it as evidence the treatment failed. The default response in that case, stopping altogether, is the one outcome the whole programme is built to prevent.";
const EVIDENCE = [
  "<strong>Evidence.</strong> The pain-monitoring approach comes from a randomised trial in Achilles tendinopathy (Silbernagel 2007, <em>Am J Sports Med</em>; n=38, PEDro 8/10), which found that continued pain-monitored loading produced no demonstrable negative effect — it supports permission to load, not a specific number. The 4/10 threshold is convention, quoted variously as 4 or 5 out of 10, and has never been tested in AC osteoarthritis, in the shoulder, or in osteoarthritis of any joint.",
  "The reintervention figure is from Miedema 2023 (<em>Clin Shoulder Elb</em>; 58% of injected patients had a further intervention, 86% of those within the first year). The reassessment pathway rests on the base-rate prevalence data (Rossano 2022, <em>J Orthop</em>) and the chance-level performance of the clinical examination (Cadogan 2013, <em>BMC Musculoskelet Disord</em>; AUC 0.507). The timescales themselves — 24 hours, a few days, one to two weeks, six weeks — are clinical convention, not validated thresholds.",
];

const FIGURES = [
  {
    key: "fig1" as const,
    title: MARKER,
    alt: "A six-row table organised by time since the exercise session. During the session, within 24 hours and the next morning are dosing decisions. Symptoms persisting a few days are a flare. Persisting one to two weeks, or no functional progress at six weeks, means reassessing the diagnosis.",
    caption: CAPTION1,
  },
  {
    key: "fig2" as const,
    title: "Figure 2 · In a flare",
    alt: "Five numbered steps to take in a flare, each with detail: work out what caused it, change one lever, keep using the arm normally, short-term symptom relief, rebuild before adding. Alongside, four things not to do, and a box on how long a flare should last.",
    caption: CAPTION2,
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
  `${r.position} L${level(r)} ${r.block_type}: ${strip(r.content_config?.text ?? r.content_config?.body ?? r.content_config?.label ?? r.content_config?.title ?? (r.block_type === "comparison_table" ? JSON.stringify(r.content_config?.columns) : "")).slice(0, 80)}`;

export async function POST(req: NextRequest) {
  const { dryRun, afterPosition } = (await req.json().catch(() => ({}))) as { dryRun?: boolean; afterPosition?: number };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(
      `SELECT d.id FROM disease d WHERE d.canonical_name ILIKE '%acromioclavicular osteoarthritis%'`
    );
    if (d.length !== 1) throw new Error(`expected one page, found ${d.length}`);
    const diseaseId = d[0].id;
    const { rows } = await client.query<Row>(
      `SELECT position, block_type::text AS block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position FOR UPDATE`,
      [diseaseId]
    );

    const already = rows.some((r) => r.block_type === "medical_illustration" && strip(r.content_config?.title) === MARKER);
    if (already) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "the figures are already on the page" });
    }

    const hits = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.block_type === "subsection_heading" && strip(r.content_config?.text).toLowerCase() === "patient education");
    if (hits.length !== 1) throw new Error(`expected one Patient education heading, found ${hits.length}`);
    const h = hits[0].i;
    let next = rows.findIndex((r, i) => i > h && level(r) <= 2);
    if (next < 0) next = rows.length;
    const sec = rows.slice(h, next);
    const anchor = afterPosition == null ? sec[sec.length - 1] : sec.find((r) => r.position === afterPosition);
    if (!anchor) throw new Error(`position ${afterPosition} is not inside the section`);
    const plan = {
      parentSection: preview([...rows.slice(0, h)].reverse().find((r) => level(r) === 1) ?? rows[0]),
      sectionTail: sec.slice(-6).map(preview),
      sectionBlocks: sec.length,
      nextHeading: rows[next] ? preview(rows[next]) : null,
      insertAfterPosition: anchor.position,
      insertAfter: preview(anchor),
    };
    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }

    // Write the images the way an editor upload does, then one illustration row each.
    const dir = path.join(process.cwd(), "public", "uploads", "illustrations");
    await mkdir(dir, { recursive: true });
    const illustrationIds: Record<string, string> = {};
    for (const f of FIGURES) {
      const filename = `${randomUUID()}.png`;
      await writeFile(path.join(dir, filename), Buffer.from((content as Record<string, string>)[f.key], "base64"));
      const { rows: mi } = await client.query<{ id: string }>(
        `INSERT INTO medical_illustration (title, asset_url, alt_text, status) VALUES ($1, $2, $3, 'draft') RETURNING id`,
        [f.title, `/api/uploads/illustrations/${filename}`, f.alt]
      );
      illustrationIds[f.key] = mi[0].id;
      await client.query(
        `INSERT INTO illustration_usage (medical_illustration_id, target_type, target_id) VALUES ($1, 'disease', $2) ON CONFLICT (medical_illustration_id, target_type, target_id) DO NOTHING`,
        [mi[0].id, diseaseId]
      );
    }

    type NewBlock = { type: string; cfg: Record<string, unknown>; ref?: string };
    const blocks: NewBlock[] = [
      { type: "subsubsection_heading", cfg: { text: HEADING } },
      { type: "paragraph", cfg: { body: STANDFIRST } },
      ...FIGURES.flatMap((f): NewBlock[] => [
        { type: "medical_illustration", cfg: { title: f.title, imageWidth: "full" }, ref: illustrationIds[f.key] },
        { type: "paragraph", cfg: { body: f.caption } },
      ]),
      ...EVIDENCE.map((body): NewBlock => ({ type: "paragraph", cfg: { body } })),
    ];

    const n = blocks.length;
    await client.query(`UPDATE editorial_block SET position = -(position + $3) WHERE disease_id = $1 AND position > $2`, [diseaseId, anchor.position, n]);
    await client.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1 AND position < 0`, [diseaseId]);
    for (const [idx, bl] of blocks.entries()) {
      await client.query(
        `INSERT INTO editorial_block (disease_id, position, block_type, referenced_object_id, content_config) VALUES ($1, $2, $3, $4, $5)`,
        [diseaseId, anchor.position + 1 + idx, bl.type, bl.ref ?? null, JSON.stringify(bl.cfg)]
      );
    }
    await client.query("COMMIT");
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, inserted: n, illustrationIds, plan });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
