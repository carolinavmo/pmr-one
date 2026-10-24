import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds two tables to the "How much volume to inject?" sub-subsection
// of the Hydrodilation part of the Adhesive Capsulitis page: the capsule
// rupture vs preservation comparison (after the paragraph that starts
// "Historically, operators aimed") and the capsule-preserving outcomes table
// (after the paragraph that starts "The older literature used"). POST
// {dryRun:true} lists the heading's blocks and where each table would go; POST
// {} inserts them. One transaction; a table already on the page (matched by a
// row label) is skipped. Remove once run.

const b = (t: string) => `<strong>${t}</strong>`;
const TABLES: { marker: string; after: RegExp; columns: string[]; rows: string[][] }[] = [
  {
    marker: "Keep injecting until",
    after: /^historically, operators aimed/i,
    columns: ["", "Capsule rupture (brisement)", "Capsule preservation"],
    rows: [
      [b("The idea"), `Keep injecting until the capsule ${b("bursts")}, mechanically tearing the contracted tissue`, `Distend to ${b("maximum tolerated volume")}, stop ${b("before")} it bursts`],
      [b("The endpoint"), "Sudden loss of injection resistance; pain in the axilla or medial humerus; extracapsular fluid on ultrasound", "Resistance prevents further injection, or the patient reaches their limit"],
      [b("Volume"), "Whatever it takes", "Whatever the capsule will hold"],
    ],
  },
  {
    marker: "Capsule-preserving vs rupture",
    after: /^the older literature used/i,
    columns: ["Outcome", "Result"],
    rows: [
      ["Both groups at every timepoint", "Improved significantly from baseline (P &lt; 0.001)"],
      [b("Capsule-preserving vs rupture"), `${b("Significantly better DASH and VAS at 1, 3 and 6 months")} (P &lt; 0.001)`],
      ["Multivariate analysis", b("Capsule rupture independently predicted worse DASH at every timepoint")],
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
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(
      `SELECT d.id FROM disease d WHERE d.canonical_name ILIKE '%adhesive capsulitis%'`
    );
    if (d.length !== 1) throw new Error(`expected one page, found ${d.length}`);
    const diseaseId = d[0].id;
    const { rows } = await client.query<Row>(
      `SELECT position, block_type::text AS block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position FOR UPDATE`,
      [diseaseId]
    );

    const present = (marker: string) =>
      rows.find((r) => r.block_type === "comparison_table" && JSON.stringify(r.content_config?.rows).includes(marker));
    const todo = TABLES.filter((t) => !present(t.marker));
    if (todo.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "both tables are already on the page" });
    }

    const underHydrodilation = (i: number) => {
      for (let k = i - 1; k >= 0; k--) {
        if (level(rows[k]) <= 2) return /hydrodilat/i.test(strip(rows[k].content_config?.text));
      }
      return false;
    };
    const hits = rows.map((r, i) => ({ r, i })).filter(({ r, i }) => level(r) === 3 && /how much volume to inject/i.test(strip(r.content_config?.text)) && underHydrodilation(i));
    if (hits.length !== 1) throw new Error(`expected one matching heading, found ${hits.length}: ${hits.map((x) => preview(x.r)).join(" | ")}`);
    const h = hits[0].i;
    const hl = level(rows[h]);
    let next = rows.findIndex((r, i) => i > h && level(r) <= hl);
    if (next < 0) next = rows.length;
    const sec = rows.slice(h, next);
    const placed = todo.map((t) => {
      const at = sec.find((r) => r.block_type === "paragraph" && t.after.test(strip(r.content_config?.body)));
      if (!at) throw new Error(`no paragraph in the section matches ${t.after}`);
      return { t, at };
    });
    const plan = {
      section: sec.map(preview),
      nextHeading: rows[next] ? preview(rows[next]) : null,
      willAdd: placed.map(({ t, at }) => `${t.marker} → after ${preview(at)}`),
    };

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }

    // Later anchors first, so an earlier anchor's position never moves under us.
    const inserted: string[] = [];
    for (const { t, at } of [...placed].sort((x, y) => y.at.position - x.at.position)) {
      await client.query(`UPDATE editorial_block SET position = -(position + 1) WHERE disease_id = $1 AND position > $2`, [diseaseId, at.position]);
      await client.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1 AND position < 0`, [diseaseId]);
      const { rows: ins } = await client.query<{ id: string }>(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, 'comparison_table', $3) RETURNING id`,
        [diseaseId, at.position + 1, JSON.stringify({ columns: t.columns, rows: t.rows })]
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
