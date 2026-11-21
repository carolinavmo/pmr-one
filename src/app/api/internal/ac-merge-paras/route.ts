import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// TEMPORARY — on the Acromioclavicular Joint Injury page, merges every run of
// 2+ consecutive plain paragraph blocks into ONE paragraph block (bodies
// concatenated, so each former paragraph stays its own <p>). Plain = block_type
// paragraph, content_config has only `body`, no display_config overrides (so
// the small grey source lines, which carry a layout override, are never
// merged and still break a run). Runs touching a block that has translations
// or annotations are skipped. POST {dryRun:true} reports and rolls back.
// Remove once run.

const SLUG = "acromioclavicular-joint-injury";

type Row = { id: string; position: number; block_type: string; content_config: Record<string, unknown>; display_config: Record<string, unknown> | null };
const strip = (s: unknown) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const isPlain = (r: Row) =>
  r.block_type === "paragraph" &&
  Object.keys(r.content_config).length === 1 &&
  typeof r.content_config.body === "string" &&
  (!r.display_config || Object.keys(r.display_config).length === 0);

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
    const { rows: tr } = await client.query<{ block_id: string }>(
      `SELECT DISTINCT block_id FROM editorial_block_translation WHERE block_id = ANY($1::uuid[])`,
      [blocks.map((b) => b.id)]
    );
    const { rows: an } = await client.query<{ block_id: string }>(
      `SELECT DISTINCT block_id FROM annotation WHERE disease_id = $1`,
      [diseaseId]
    );
    const guarded = new Set([...tr.map((r) => r.block_id), ...an.map((r) => r.block_id)]);

    // collect runs of consecutive plain paragraphs
    const runs: Row[][] = [];
    let cur: Row[] = [];
    for (const b of blocks) {
      if (isPlain(b) && !guarded.has(b.id)) cur.push(b);
      else {
        if (cur.length > 1) runs.push(cur);
        cur = [];
      }
    }
    if (cur.length > 1) runs.push(cur);

    const summary = {
      blocksBefore: blocks.length,
      runs: runs.length,
      blocksRemoved: runs.reduce((n, r) => n + r.length - 1, 0),
      guardedBlocks: guarded.size,
      sample: runs.slice(0, 6).map((r) => ({ at: r[0].position, size: r.length, first: strip(r[0].content_config.body).slice(0, 50), last: strip(r[r.length - 1].content_config.body).slice(0, 50) })),
      biggest: Math.max(0, ...runs.map((r) => r.length)),
    };
    if (dryRun || runs.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: !!dryRun, summary });
    }

    for (const run of runs) {
      const merged = run.map((b) => b.content_config.body as string).join("");
      await client.query(`UPDATE editorial_block SET content_config = $1 WHERE id = $2`, [JSON.stringify({ body: merged }), run[0].id]);
      await client.query(`DELETE FROM editorial_block WHERE id = ANY($1::uuid[])`, [run.slice(1).map((b) => b.id)]);
    }
    const { rows: count } = await client.query<{ n: string }>(`SELECT COUNT(*) AS n FROM editorial_block WHERE disease_id = $1`, [diseaseId]);
    await client.query("COMMIT");

    revalidateShellSurfaces();
    revalidateTag("library-tree", { expire: 0 });
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, summary, blocksOnPage: Number(count[0].n) });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
