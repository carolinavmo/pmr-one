import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { revalidatePath, revalidateTag } from "next/cache";
import content from "./content.json";

// TEMPORARY — creates the "Rotator cuff tendinopathy" condition page under
// MSK › Shoulder from rotator-cuff-tendinopathy.pdf (blocks live in
// content.json next to this file). Creates a draft disease row exactly like
// createDiseaseAction, then inserts every block in one transaction. Skipped
// if a disease with this name already exists. POST {dryRun:true} reports what
// would be done without writing. Remove this route once run.

const NAME = "Rotator cuff tendinopathy";
const TOPIC = "Shoulder";

type Block = { type: string; content: Record<string, unknown> };
const BLOCKS = content as Block[];
const ALLOWED = new Set(["section_heading", "subsection_heading", "paragraph", "comparison_table", "highlight_card"]);

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };

  for (const b of BLOCKS) if (!ALLOWED.has(b.type)) return NextResponse.json({ ok: false, error: `unexpected block type ${b.type}` }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: topics } = await client.query<{ id: string; name: string; kind: string; parent_id: string | null }>(
      `SELECT id, name, kind, parent_id FROM topic WHERE name = $1 AND kind = 'topic'`,
      [TOPIC]
    );
    if (topics.length !== 1) throw new Error(`expected exactly one "${TOPIC}" topic, found ${topics.length}: ${JSON.stringify(topics)}`);
    const topic = topics[0];
    const { rows: existing } = await client.query<{ id: string; slug: string }>(
      `SELECT id, slug FROM disease WHERE topic_id = $1 AND lower(canonical_name) = lower($2)`,
      [topic.id, NAME]
    );
    if (existing.length) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "already exists in this topic", existing });
    }
    // Same slug scheme as createDiseaseAction: -2, -3 … when taken elsewhere.
    const base = slugify(NAME);
    const { rows: taken } = await client.query<{ slug: string }>(`SELECT slug FROM disease WHERE slug = $1 OR slug LIKE $2`, [base, `${base}-%`]);
    const takenSet = new Set(taken.map((r) => r.slug));
    let slug = base;
    for (let n = 2; takenSet.has(slug); n++) slug = `${base}-${n}`;

    const { rows: children } = await client.query<{ id: string; name: string }>(`SELECT id, name FROM topic WHERE parent_id = $1 ORDER BY position`, [topic.id]);
    const { rows: siblings } = await client.query<{ canonical_name: string; status: string }>(
      `SELECT canonical_name, status::text AS status FROM disease WHERE topic_id = $1 ORDER BY position, canonical_name`,
      [topic.id]
    );

    const counts: Record<string, number> = {};
    for (const b of BLOCKS) counts[b.type] = (counts[b.type] ?? 0) + 1;
    const plan = { topic, children, existingPagesInTopic: siblings, slug, blocks: BLOCKS.length, counts };

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }

    const { rows: created } = await client.query<{ id: string; slug: string }>(
      `INSERT INTO disease (canonical_name, slug, topic_id, status) VALUES ($1, $2, $3, 'draft') RETURNING id, slug`,
      [NAME, slug, topic.id]
    );
    const diseaseId = created[0].id;
    for (let i = 0; i < BLOCKS.length; i++) {
      await client.query(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, $3::editorial_block_type, $4)`,
        [diseaseId, (i + 1) * 10, BLOCKS[i].type, JSON.stringify(BLOCKS[i].content)]
      );
    }
    await client.query("COMMIT");

    // updateTag (what the server actions use) is Server-Action-only.
    revalidateTag("library-tree", { expire: 0 });
    revalidatePath("/[locale]", "layout");
    return NextResponse.json({ ok: true, created: created[0], plan });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
