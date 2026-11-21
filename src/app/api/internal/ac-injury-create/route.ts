import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";
import { BLOCKS } from "./content";

// TEMPORARY — creates the Acromioclavicular Joint Injury and Dislocation page (draft) under
// the AC Pathology topic and fills it with the blocks converted from
// ac-joint-injury.md. POST {dryRun:true} reports what it would
// do and rolls back. A page with this slug already there is left alone.
// Remove once run.

const NAME = "Acromioclavicular Joint Injury and Dislocation";
const SLUG = "acromioclavicular-joint-injury";
const ALIASES = ["AC joint injury", "AC joint separation", "AC joint dislocation", "Shoulder separation", "Acromioclavicular separation"];

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: topic } = await client.query<{ id: string }>(`SELECT id FROM topic WHERE slug = 'ac-pathology'`);
    if (topic.length !== 1) throw new Error(`expected one ac-pathology topic, found ${topic.length}`);
    const topicId = topic[0].id;

    const { rows: existing } = await client.query(`SELECT id FROM disease WHERE slug = $1`, [SLUG]);
    if (existing.length) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "a page with this slug already exists" });
    }

    const { rows: pos } = await client.query<{ next: number }>(
      `SELECT COALESCE(MAX(position) + 1, 0) AS next FROM disease WHERE topic_id = $1`,
      [topicId]
    );
    const { rows: ins } = await client.query<{ id: string }>(
      `INSERT INTO disease (canonical_name, aliases, slug, topic_id, status, position) VALUES ($1, $2, $3, $4, 'draft', $5) RETURNING id`,
      [NAME, ALIASES, SLUG, topicId, pos[0].next]
    );
    const diseaseId = ins[0].id;

    for (const b of BLOCKS) {
      await client.query(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config, display_config) VALUES ($1, $2, $3, $4, $5)`,
        [diseaseId, b.position, b.block_type, JSON.stringify(b.content_config), JSON.stringify(b.display_config ?? {})]
      );
    }

    const counts: Record<string, number> = {};
    for (const b of BLOCKS) counts[b.block_type] = (counts[b.block_type] ?? 0) + 1;
    const summary = { topicId, position: pos[0].next, blocks: BLOCKS.length, counts };

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, summary });
    }

    await client.query("COMMIT");
    revalidateShellSurfaces();
    revalidateTag("library-tree", { expire: 0 });
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, diseaseId, summary });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
