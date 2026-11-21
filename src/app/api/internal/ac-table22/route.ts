import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// TEMPORARY — adds the Conoid/Trapezoid table to 2.2 "The two systems" on the
// Acromioclavicular Joint Injury draft, after the user-edited ligament paragraph
// (position 240) and before the "In one line" highlight card.
// POST {dryRun:true} reports and rolls back. Remove once run.

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

    const { rows: head } = await client.query<{ position: number }>(
      `SELECT position FROM editorial_block WHERE disease_id = $1 AND block_type = 'subsection_heading' AND content_config->>'text' = 'The two systems'`,
      [diseaseId]
    );
    if (head.length !== 1) throw new Error(`expected one heading, found ${head.length}`);
    const { rows: anchor } = await client.query<{ position: number; body: string }>(
      `SELECT position, content_config->>'body' AS body FROM editorial_block
       WHERE disease_id = $1 AND block_type = 'paragraph' AND position > $2 AND content_config->>'body' LIKE '%Acromioclavicular Ligaments%'
       ORDER BY position LIMIT 1`,
      [diseaseId, head[0].position]
    );
    if (anchor.length !== 1) throw new Error("anchor paragraph not found");
    const at = anchor[0].position;
    const { rows: next } = await client.query<{ position: number; block_type: string }>(
      `SELECT position, block_type FROM editorial_block WHERE disease_id = $1 AND position > $2 ORDER BY position LIMIT 1`,
      [diseaseId, at]
    );
    const info = { heading: head[0].position, anchorPosition: at, anchorHtml: anchor[0].body, next: next[0] };
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
