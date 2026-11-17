import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// TEMPORARY — adds the DCO vs AC osteoarthritis differential table to the
// Distal Clavicular Osteolysis draft. POST {} (or {dryRun:true}) outlines the
// blocks around headings that mention "differential" and rolls back.
// POST {afterPosition} inserts the table right after the block at that
// position. Skips if already there. Remove once run.

const SLUG = "distal-clavicular-osteolysis";
const SECOND_HEADER = "Distal Clavicular Osteolysis (DCO)";

const b = (s: string) => `<strong>${s}</strong>`;
// Reference numbers as small grey chips, like the source: tinted background,
// small grey text. Only classes the rich-text sanitizer already allows.
const ref = (n: number) => `<span class="bg-card-gray/25"><span class="text-xs"><span class="text-card-gray">&nbsp;${n}&nbsp;</span></span></span>`;
const refs = (...ns: number[]) => ns.map(ref).join(" ");

const NEW_TABLE = {
  columns: ["Feature", SECOND_HEADER, "AC Joint Osteoarthritis (AC OA)"],
  rows: [
    [b("Demographics"), `Young athletes / weightlifters (&lt;40 yrs) ${refs(3, 16)}`, `Older adults (&gt;40–50 yrs) ${refs(5)}`],
    [b("Joint Space"), `Pathologic ${b("widening")} (&gt;5 mm) ${refs(15, 34)}`, `Pathologic ${b("narrowing")} ${refs(5, 33)}`],
    [b("Bony Changes"), `Subchondral erosion &amp; clavicular tapering ${refs(33, 34)}`, `Subchondral sclerosis &amp; osteophytes ${refs(5, 33)}`],
    [b("Anatomical Scope"), `Isolated to distal clavicle (acromion spared) ${refs(33, 34)}`, `Involves ${b("both")} clavicular &amp; acromial facets ${refs(5)}`],
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
  const { dryRun, afterPosition } = (await req.json().catch(() => ({}))) as { dryRun?: boolean; afterPosition?: number };
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
        strip((x.content_config.columns as string[] | undefined)?.[0]) === "Feature" &&
        strip((x.content_config.columns as string[] | undefined)?.[1]) === SECOND_HEADER
    );
    if (already) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "table already present", position: already.position });
    }

    if (dryRun || afterPosition === undefined) {
      await client.query("ROLLBACK");
      const idx = blocks.map((x, i) => (/differential/i.test(strip(x.content_config.text)) && /heading/.test(x.block_type) ? i : -1)).filter((i) => i >= 0);
      const outline = idx.map((i) => ({
        heading: `${blocks[i].position} ${blocks[i].block_type}: ${label(blocks[i])}`,
        around: blocks.slice(Math.max(0, i - 2), i + 8).map((x) => `${x.position} ${x.block_type}: ${label(x)}`),
      }));
      return NextResponse.json({ ok: true, dryRun: true, total: blocks.length, outline });
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
