import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// TEMPORARY — adds the "quick answers" table to section 2 of the Distal
// Clavicular Osteolysis draft. POST {} (or {dryRun:true}) lists section 2's
// blocks and rolls back. POST {afterPosition} inserts the table right after
// the block at that position. Skips if already there. Remove once run.

const SLUG = "distal-clavicular-osteolysis";
const FIRST_LABEL = "Who gets it?";

const b = (s: string) => `<strong>${s}</strong>`;
const NEW_TABLE = {
  columns: ["", ""],
  hideHeader: true,
  rows: [
    [b(FIRST_LABEL), `Almost always someone who lifts. ${b("Bench press alone accounts for about half of all cases")}, with most of the rest from other weight training`],
    [b("How heavy matters"), `Among men ${b("with")} this condition, ${b("more than half")} were benching above ${b("1.5 times their bodyweight")}. Among men ${b("without")} it, only about ${b("1 in 16")} were`],
    [b("What that means"), `Heavy pressing is far commoner in people with the condition than in people without — ${b("about 19 times the odds")}. The threshold is where the risk lives`],
    [b("Does ordinary lifting cause it?"), `${b("No sign that it does.")} Pressing below that line carried no excess risk in the same study`],
    [b("How often, how long?"), `Frequent training over ${b("more than five years")}. Sources disagree on the frequency threshold — one says more than once a week, another more than three times`],
    [b("Men or women?"), `Overwhelmingly men — about ${b("19 in 20")} across the published literature. But up to ${b("1 in 4")} patients in clinic imaging series are women, so don't rule it out on sex`],
    [b("Teenagers"), `The risk factor identified was the ${b("combination")} of an overhead sport <em>and</em> supplemental weights. The two separately weren't tested`],
    [b("After an injury?"), `A ${b("different route to the same problem")} — appears weeks to months after an AC joint injury and behaves differently afterwards`],
    [b("One shoulder or both?"), `In one small surgical series, ${b("11 of 14 had changes on both sides")} — and several developed symptoms on the second side after returning to lifting. ${b("Worth checking the other shoulder")}`],
  ],
};

type Row = { id: string; position: number; block_type: string; content_config: Record<string, unknown> };
const strip = (s: unknown) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const label = (r: Row) => {
  const c = r.content_config;
  if (r.block_type === "comparison_table") return `[table ${(c.columns as string[]).length}x${(c.rows as unknown[]).length}] ${strip((c.columns as string[]).join(" | ")).slice(0, 50)} :: ${strip((c.rows as string[][])[0]?.[0])}`;
  return strip(c.body ?? c.text ?? c.label).slice(0, 70);
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
      (x) => x.block_type === "comparison_table" && strip((x.content_config.rows as string[][] | undefined)?.[0]?.[0]) === FIRST_LABEL
    );
    if (already) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "table already present", position: already.position });
    }

    if (dryRun || afterPosition === undefined) {
      await client.query("ROLLBACK");
      const h = blocks.findIndex((x) => x.block_type === "section_heading" && strip(x.content_config.text) === "Epidemiology and risk factors");
      const end = blocks.findIndex((x, i) => i > h && x.block_type === "section_heading");
      const outline = blocks.slice(h, end < 0 ? undefined : end).map((x) => `${x.position} ${x.block_type}: ${label(x)}`);
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
