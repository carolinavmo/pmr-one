import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// TEMPORARY — adds one table to section 2 (Epidemiology and risk factors) of
// the Distal Clavicular Osteolysis draft, straight after the existing 2.1
// table and its source line. POST {dryRun:true} reports and rolls back.
// Skips if the table is already there. Remove once run.

const SLUG = "distal-clavicular-osteolysis";
const FIRST_ROW_LABEL = "Patients across all included studies";

const NEW_TABLE = {
  columns: ["", ""],
  hideHeader: true,
  rows: [
    [FIRST_ROW_LABEL, "<strong>483</strong> — 454 male, <strong>29 female</strong>"],
    ["Controls", "288"],
    ["Mean age range across studies", "<strong>15.9 – 39 years</strong>"],
    ["Full age range", "<strong>13 – 66 years</strong>"],
    ["Prevalence among 13–19-year-olds imaged for shoulder pain", "<strong>6.5%</strong> (93 of 1,432 MRIs)"],
  ],
};

type Row = { id: string; position: number; block_type: string; content_config: Record<string, unknown>; display_config: Record<string, unknown> };

const strip = (s: unknown) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(`SELECT id FROM disease WHERE slug = $1`, [SLUG]);
    if (d.length !== 1) throw new Error(`expected one page with slug ${SLUG}, found ${d.length}`);
    const diseaseId = d[0].id;

    const { rows: blocks } = await client.query<Row>(
      `SELECT id, position, block_type, content_config, display_config FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
      [diseaseId]
    );

    const already = blocks.find(
      (b) => b.block_type === "comparison_table" && strip((b.content_config.rows as string[][] | undefined)?.[0]?.[0]) === FIRST_ROW_LABEL && (b.content_config.rows as unknown[]).length === 5
    );
    if (already) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "table already present", position: already.position });
    }

    const h = blocks.findIndex((b) => b.block_type === "section_heading" && strip(b.content_config.text) === "Epidemiology and risk factors");
    if (h < 0) throw new Error("section heading not found");
    const t = blocks.findIndex((b, i) => i > h && b.block_type === "comparison_table");
    if (t < 0) throw new Error("no table found in section 2");
    // the source line that sits under that table, if there is one
    const next = blocks[t + 1];
    const hasSource = next?.block_type === "paragraph" && String(next.content_config.body).includes("text-card-gray");
    const anchor = hasSource ? next : blocks[t];
    const after = blocks[blocks.indexOf(anchor) + 1];

    const info = {
      diseaseId,
      totalBlocks: blocks.length,
      existingTable: { position: blocks[t].position, config: blocks[t].content_config, display: blocks[t].display_config },
      anchor: { position: anchor.position, type: anchor.block_type, text: strip(anchor.content_config.body ?? "").slice(0, 80) },
      after: after ? { position: after.position, type: after.block_type, text: strip(after.content_config.body ?? after.content_config.text ?? "").slice(0, 80) } : null,
    };

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, info });
    }

    // make room: move everything after the anchor up one slot (two steps so the
    // UNIQUE (disease_id, position) constraint never sees a clash)
    const newPos = anchor.position + 10;
    await client.query(`UPDATE editorial_block SET position = position + 1000000 WHERE disease_id = $1 AND position > $2`, [diseaseId, anchor.position]);
    await client.query(`UPDATE editorial_block SET position = position - 999990 WHERE disease_id = $1 AND position > 1000000`, [diseaseId]);
    await client.query(
      `INSERT INTO editorial_block (disease_id, position, block_type, content_config, display_config) VALUES ($1, $2, 'comparison_table', $3, $4)`,
      [diseaseId, newPos, JSON.stringify(NEW_TABLE), JSON.stringify(blocks[t].display_config ?? {})]
    );

    const { rows: count } = await client.query<{ n: string }>(`SELECT COUNT(*) AS n FROM editorial_block WHERE disease_id = $1`, [diseaseId]);
    await client.query("COMMIT");

    revalidateShellSurfaces();
    revalidateTag("library-tree", { expire: 0 });
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, insertedAt: newPos, blocksOnPage: Number(count[0].n), info });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
