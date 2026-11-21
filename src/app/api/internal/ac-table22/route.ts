import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// TEMPORARY — in 2.2 "The two systems" of the Acromioclavicular Joint Injury
// draft, the user pasted the Conoid/Trapezoid table as a raw <table> inside a
// paragraph block. Split that block around the <table>: before-text stays in
// the block, the table becomes a real comparison_table block, the after-text
// becomes a new paragraph block. POST {dryRun:true} reports and rolls back.
// Remove once run.

const SLUG = "acromioclavicular-joint-injury";
const COLUMNS = ["Ligament", "Anatomy", "Main biomechanical role"];
const ROWS = [
  ["<strong>Conoid</strong>", "Medial, more vertically oriented", "Major restraint to superior displacement of the clavicle relative to the scapula"],
  ["<strong>Trapezoid</strong>", "Lateral, more obliquely oriented", "Resists compressive forces and contributes to horizontal and rotational stability"],
];

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(`SELECT id FROM disease WHERE slug = $1`, [SLUG]);
    if (d.length !== 1) throw new Error(`expected one page, found ${d.length}`);
    const diseaseId = d[0].id;

    const { rows: dup } = await client.query(
      `SELECT id FROM editorial_block WHERE disease_id = $1 AND block_type = 'comparison_table' AND content_config->'columns'->>0 = 'Ligament'`,
      [diseaseId]
    );
    if (dup.length) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "table block already present" });
    }

    const { rows: anchor } = await client.query<{ id: string; position: number; content_config: Record<string, unknown>; display_config: unknown }>(
      `SELECT id, position, content_config, display_config FROM editorial_block
       WHERE disease_id = $1 AND block_type = 'paragraph' AND content_config->>'body' LIKE '%Coracoclavicular Ligaments%' AND content_config->>'body' LIKE '%<table>%'`,
      [diseaseId]
    );
    if (anchor.length !== 1) throw new Error(`expected one block holding the raw table, found ${anchor.length}`);
    const blk = anchor[0];
    const body = String(blk.content_config.body);
    const open = body.indexOf("<table>");
    const close = body.indexOf("</table>");
    if (open < 0 || close < open || body.indexOf("<table>", open + 1) >= 0) throw new Error("unexpected table markup");
    const before = body.slice(0, open);
    const after = body.slice(close + "</table>".length);

    const { rows: tr } = await client.query(`SELECT 1 FROM editorial_block_translation WHERE block_id = $1 LIMIT 1`, [blk.id]);
    const { rows: an } = await client.query(`SELECT 1 FROM annotation WHERE block_id = $1 LIMIT 1`, [blk.id]);
    if (tr.length || an.length) throw new Error("block has translations/annotations — not touching it");
    if (Object.keys(blk.content_config).length !== 1) throw new Error("block has extra content_config keys");

    const strip = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const info = {
      position: blk.position,
      displayConfig: blk.display_config,
      beforeTail: strip(before).slice(-90),
      afterHead: strip(after).slice(0, 90),
      beforeLen: before.length,
      afterLen: after.length,
    };
    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, info });
    }

    const at = blk.position;
    await client.query(`UPDATE editorial_block SET position = position + 1000000 WHERE disease_id = $1 AND position > $2`, [diseaseId, at]);
    await client.query(`UPDATE editorial_block SET position = position - 999980 WHERE disease_id = $1 AND position > 1000000`, [diseaseId]);
    await client.query(`UPDATE editorial_block SET content_config = $1 WHERE id = $2`, [JSON.stringify({ body: before }), blk.id]);
    await client.query(
      `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, 'comparison_table', $3)`,
      [diseaseId, at + 10, JSON.stringify({ columns: COLUMNS, rows: ROWS })]
    );
    await client.query(
      `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, 'paragraph', $3)`,
      [diseaseId, at + 20, JSON.stringify({ body: after })]
    );
    await client.query("COMMIT");

    revalidateShellSurfaces();
    revalidateTag("library-tree", { expire: 0 });
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, info, tableAt: at + 10, afterAt: at + 20 });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
