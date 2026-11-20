import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// TEMPORARY — adds the Structure / Role table (10.3) to the
// Distal Clavicular Osteolysis draft. POST {} (or {dryRun:true}) outlines the
// blocks around headings that mention "differential" and rolls back.
// POST {afterPosition} inserts the table right after the block at that
// position. Skips if already there. Remove once run.

const SLUG = "distal-clavicular-osteolysis";

const b = (s: string) => `<strong>${s}</strong>`;

const TABLES = [{
  columns: ["Structure", "Role"],
  rows: [
    ["Superior AC ligament", "Primary restraint to posterior and superior clavicular translation"],
    ["Trapezoid (coracoclavicular) ligament", "Primary restraint, superior"],
    ["Deltotrapezial fascia", "Secondary restraint"],
  ],
},
{
  columns: ["Approach", "Superior restraints"],
  rows: [
    [b("Open"), "Capsule and deltotrapezial fascia preserved and closed with figure-of-eight non-absorbable suture — a repair to protect"],
    [b("Arthroscopic, direct (superior)"), "Traversed"],
    [b("Arthroscopic, bursal (indirect)"), "Preserved — the reason this approach lowers instability risk"],
  ],
},
{
  columns: ["Restriction", "Duration", "Rationale"],
  rows: [
    [b("No cross-body (horizontal) adduction"), b("8 weeks"), "Compressive direction across the resected joint; loads the superior restraints most"],
    [b("No internal rotation behind the back"), b("4 weeks"), "Combined extension, adduction and internal rotation stresses the same structures"],
    [b("No pulleys") + " unless the surgeon specifies", "—", "End-range position hard to control"],
    [b("Heavy AC-loading lifts"), b("Added last"), "Bench press, dips, flies — see below"],
  ],
}];

type Row = { id: string; position: number; block_type: string; content_config: Record<string, unknown> };
const strip = (s: unknown) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
let FULL = false;
const label = (r: Row) => {
  const c = r.content_config;
  if (r.block_type === "comparison_table") return `[table ${(c.columns as string[]).length}x${(c.rows as unknown[]).length}] ${strip((c.columns as string[]).join(" | ")).slice(0, 70)} :: ${strip((c.rows as string[][])[0]?.[0])}`;
  return strip(c.body ?? c.text ?? c.label).slice(0, FULL ? 700 : 80);
};

export async function POST(req: NextRequest) {
  const { dryRun, afterPosition, show, find, table = 0, full } = (await req.json().catch(() => ({}))) as { table?: number; full?: boolean; dryRun?: boolean; afterPosition?: number; show?: [number, number]; find?: string };
  FULL = !!full;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(`SELECT id FROM disease WHERE slug = $1`, [SLUG]);
    if (d.length !== 1) throw new Error(`expected one page with slug ${SLUG}, found ${d.length}`);
    const diseaseId = d[0].id;
    const { rows: blocks } = await client.query<Row>(
      `SELECT id, position, block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
      [diseaseId]
    );

    const NEW_TABLE = TABLES[table];
    const already = blocks.find(
      (x) =>
        x.block_type === "comparison_table" &&
        strip((x.content_config.columns as string[] | undefined)?.[0]) === NEW_TABLE.columns[0] &&
        strip((x.content_config.columns as string[] | undefined)?.[1]) === NEW_TABLE.columns[1] &&
        strip((x.content_config.rows as string[][] | undefined)?.[0]?.[0]) === strip(NEW_TABLE.rows[0][0])
    );
    if (already) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "table already present", position: already.position });
    }

    if (dryRun || afterPosition === undefined) {
      await client.query("ROLLBACK");
      const outline = blocks.filter((x) => /heading/.test(x.block_type)).map((x) => `${x.position} ${x.block_type}: ${label(x)}`);
      const hits = find ? blocks.flatMap((x, i) => (new RegExp(find, "i").test(strip(x.content_config.body ?? x.content_config.text ?? x.content_config.label)) ? blocks.slice(Math.max(0, i - 2), i + 4).map((y) => `${y.position} ${y.block_type}: ${label(y)}`).concat(["---"]) : [])) : undefined;
      const range = show ? blocks.filter((x) => x.position >= show[0] && x.position <= show[1]).map((x) => `${x.position} ${x.block_type}: ${label(x)}`) : undefined;
      return NextResponse.json({ ok: true, dryRun: true, total: blocks.length, outline: hits ?? range ?? outline });
    }

    const anchor = blocks.find((x) => x.position === afterPosition);
    if (!anchor) throw new Error(`no block at position ${afterPosition}`);

    // two steps so UNIQUE (disease_id, position) never clashes
    await client.query(`UPDATE editorial_block SET position = position + 1000000 WHERE disease_id = $1 AND position > $2`, [diseaseId, anchor.position]);
    await client.query(`UPDATE editorial_block SET position = position - 999990 WHERE disease_id = $1 AND position > 1000000`, [diseaseId]);
    await client.query(
      `INSERT INTO editorial_block (disease_id, position, block_type, content_config, display_config) VALUES ($1, $2, 'comparison_table', $3, '{}')`,
      [diseaseId, anchor.position + 10, JSON.stringify(NEW_TABLE)]
    );
    const { rows: count } = await client.query<{ n: string }>(`SELECT COUNT(*) AS n FROM editorial_block WHERE disease_id = $1`, [diseaseId]);
    await client.query("COMMIT");

    revalidateShellSurfaces();
    revalidateTag("library-tree", { expire: 0 });
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, insertedAt: anchor.position + 10, blocksOnPage: Number(count[0].n) });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
