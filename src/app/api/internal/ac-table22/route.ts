import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// TEMPORARY — adds the Conoid/Trapezoid table to 2.2 "The two systems" on the
// Acromioclavicular Joint Injury draft, right after the "The split is not
// absolute" paragraph. POST {dryRun:true} reports and rolls back. Remove once run.

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
      return NextResponse.json({ ok: true, skipped: "table already present" });
    }

    const { rows: anchor } = await client.query<{ id: string; position: number; body: string }>(
      `SELECT id, position, content_config->>'body' AS body FROM editorial_block
       WHERE disease_id = $1 AND block_type = 'paragraph' AND content_config->>'body' LIKE '%The split is not absolute%'`,
      [diseaseId]
    );
    if (anchor.length !== 1) {
      const { rows: h } = await client.query<{ position: number }>(
        `SELECT position FROM editorial_block WHERE disease_id = $1 AND content_config->>'text' = 'The two systems'`,
        [diseaseId]
      );
      const { rows: near } = await client.query(
        `SELECT position, block_type, left(COALESCE(content_config->>'text', content_config->>'body', content_config->'columns'->>0, ''), 500) AS t FROM editorial_block WHERE disease_id = $1 AND position BETWEEN $2 AND $3 ORDER BY position`,
        [diseaseId, (h[0]?.position ?? 0) - 10, (h[0]?.position ?? 0) + 200]
      );
      throw new Error(`expected one anchor, found ${anchor.length}; heading=${JSON.stringify(h)}; near=${JSON.stringify(near)}`);
    }
    const at = anchor[0].position;
    const { rows: next } = await client.query<{ block_type: string; text: string }>(
      `SELECT block_type, COALESCE(content_config->>'text', left(content_config->>'body', 60), '') AS text
       FROM editorial_block WHERE disease_id = $1 AND position > $2 ORDER BY position LIMIT 1`,
      [diseaseId, at]
    );
    const info = { anchorPosition: at, anchorBody: anchor[0].body.replace(/<[^>]*>/g, "").slice(0, 80), nextBlock: next[0] };
    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, info });
    }

    await client.query(`UPDATE editorial_block SET position = position + 1000000 WHERE disease_id = $1 AND position > $2`, [diseaseId, at]);
    await client.query(`UPDATE editorial_block SET position = position - 999990 WHERE disease_id = $1 AND position > 1000000`, [diseaseId]);
    await client.query(
      `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, 'comparison_table', $3)`,
      [diseaseId, at + 10, JSON.stringify({ columns: COLUMNS, rows: ROWS })]
    );
    await client.query("COMMIT");

    revalidateShellSurfaces();
    revalidateTag("library-tree", { expire: 0 });
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, info, insertedAt: at + 10 });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
