import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// TEMPORARY — adds the risk-factor summary table to section 2 of the Distal
// Clavicular Osteolysis draft. POST {} (or {dryRun:true}) lists section 2's
// blocks and rolls back. POST {afterPosition, heading?} inserts the table
// (preceded by a subsection heading when `heading` is given) right after the
// block at that position. Skips if the table is already there. Remove once run.

const SLUG = "distal-clavicular-osteolysis";
const FIRST_LABEL = "Weightlifting, particularly repetitive pressing";

const b = (s: string) => `<strong>${s}</strong>`;
const NEW_TABLE = {
  columns: ["Factor", "Clinical relevance", "Strength of evidence"],
  rows: [
    [b(FIRST_LABEL), "Classic association with atraumatic DCO", "Well-described clinical association"],
    [b("Young adult age"), "Most frequently reported population", "Consistent descriptive evidence"],
    [b("Male sex"), "Historically overrepresented in published cases", "Descriptive association; independent biological risk uncertain"],
    [b("Previous AC joint trauma"), "Recognised context for post-traumatic DCO", "Established clinical association"],
    [b("High cumulative training volume"), "May increase repetitive bone stress", "Mechanistically plausible; no validated dose–risk relationship"],
    [b("Rapid increase in training load"), "May exceed current bone adaptation capacity", "Plausible extrapolation from bone stress injury principles"],
    [b("Insufficient recovery"), "May contribute to cumulative stress", "Plausible; DCO-specific thresholds unavailable"],
    [b("Repetitive occupational or sporting loading"), "Possible contribution through cumulative AC-region stress", "Limited, heterogeneous evidence"],
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
  const { dryRun, afterPosition, heading } = (await req.json().catch(() => ({}))) as { dryRun?: boolean; afterPosition?: number; heading?: string };
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
    const toInsert: { type: string; cfg: unknown }[] = [];
    if (heading) toInsert.push({ type: "subsection_heading", cfg: { text: heading } });
    toInsert.push({ type: "comparison_table", cfg: NEW_TABLE });

    const shift = toInsert.length * 10;
    // two steps so UNIQUE (disease_id, position) never clashes
    await client.query(`UPDATE editorial_block SET position = position + 1000000 WHERE disease_id = $1 AND position > $2`, [diseaseId, anchor.position]);
    await client.query(`UPDATE editorial_block SET position = position - ${1000000 - shift} WHERE disease_id = $1 AND position > 1000000`, [diseaseId]);
    let pos = anchor.position;
    for (const it of toInsert) {
      pos += 10;
      await client.query(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config, display_config) VALUES ($1, $2, $3, $4, '{}')`,
        [diseaseId, pos, it.type, JSON.stringify(it.cfg)]
      );
    }
    const { rows: count } = await client.query<{ n: string }>(`SELECT COUNT(*) AS n FROM editorial_block WHERE disease_id = $1`, [diseaseId]);
    await client.query("COMMIT");

    revalidateShellSurfaces();
    revalidateTag("library-tree", { expire: 0 });
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, inserted: toInsert.map((x) => x.type), lastPosition: pos, blocksOnPage: Number(count[0].n) });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
