import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// TEMPORARY — adds the Complication / Mechanism table (10.2 Complications of the surgery) to the
// Distal Clavicular Osteolysis draft. POST {} (or {dryRun:true}) outlines the
// blocks around headings that mention "differential" and rolls back.
// POST {afterPosition} inserts the table right after the block at that
// position. Skips if already there. Remove once run.

const SLUG = "distal-clavicular-osteolysis";
const SECOND_HEADER = "Mechanism";

const b = (s: string) => `<strong>${s}</strong>`;

const NEW_TABLE = {
  columns: ["Complication", SECOND_HEADER],
  rows: [
    [b("Persistent AC joint pain"), "Inadequate or uneven resection, with residual bony contact"],
    [b("AC joint instability"), "Excessive resection or injury to stabilizing capsuloligamentous structures"],
    [b("Persistent shoulder symptoms"), "Incorrect diagnosis or untreated coexisting shoulder pathology"],
    [b("Weakness"), "Possible disruption of the deltotrapezial or AC joint stabilizing structures"],
    [b("Other surgical complications"), "Infection, stiffness, scar-related symptoms, or postoperative pain"],
  ],
};

type Row = { id: string; position: number; block_type: string; content_config: Record<string, unknown> };
const strip = (s: unknown) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const label = (r: Row) => {
  const c = r.content_config;
  if (r.block_type === "comparison_table") return `[table ${(c.columns as string[]).length}x${(c.rows as unknown[]).length}] ${strip((c.columns as string[]).join(" | ")).slice(0, 70)} :: ${strip((c.rows as string[][])[0]?.[0])}`;
  return strip(c.body ?? c.text ?? c.label).slice(0, 80);
};

export async function POST(req: NextRequest) {
  const { dryRun, afterPosition, show, find } = (await req.json().catch(() => ({}))) as { dryRun?: boolean; afterPosition?: number; show?: [number, number]; find?: string };
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

    const already = blocks.find(
      (x) =>
        x.block_type === "comparison_table" &&
        strip((x.content_config.columns as string[] | undefined)?.[0]) === "Complication" &&
        strip((x.content_config.columns as string[] | undefined)?.[1]) === SECOND_HEADER &&
        strip((x.content_config.rows as string[][] | undefined)?.[0]?.[0]) === "Persistent AC joint pain"
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
