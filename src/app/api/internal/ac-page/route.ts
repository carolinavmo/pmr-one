import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import content from "./content.json";
import images from "./pathway.json";

// TEMPORARY — creates the "Adhesive Capsulitis" condition page under MSK ›
// Shoulder from the Markdown chapter (blocks live in content.json next to this
// file; the pathway flowchart image is embedded in pathway.json). Creates a
// draft disease row exactly like createDiseaseAction, writes the flowchart to
// the uploads volume the way the editor's own image upload does, then inserts
// every block in one transaction. Skipped if a page with this name already
// exists in the topic. POST {dryRun:true} reports what would be done without
// writing. Remove this route once run.

const NAME = "Adhesive Capsulitis";
const TOPIC = "Shoulder";

type Block = { type: string; content: Record<string, unknown> };
const BLOCKS = content as Block[];
const ALLOWED = new Set(["section_heading", "subsection_heading", "paragraph", "comparison_table", "highlight_card", "simple_image"]);

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };

  for (const b of BLOCKS) if (!ALLOWED.has(b.type)) return NextResponse.json({ ok: false, error: `unexpected block type ${b.type}` }, { status: 400 });

  const client = await pool.connect();
  let writtenFile: string | null = null;
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

    const { rows: siblings } = await client.query<{ canonical_name: string; status: string }>(
      `SELECT canonical_name, status::text AS status FROM disease WHERE topic_id = $1 ORDER BY position, canonical_name`,
      [topic.id]
    );
    const counts: Record<string, number> = {};
    for (const b of BLOCKS) counts[b.type] = (counts[b.type] ?? 0) + 1;
    const plan = { topic, existingPagesInTopic: siblings, slug, blocks: BLOCKS.length, counts };

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }

    // the flowchart: same place and URL scheme as the editor's image upload
    const imageBlock = BLOCKS.find((b) => b.type === "simple_image");
    let imageUrl: string | null = null;
    if (imageBlock) {
      const key = String(imageBlock.content.__image);
      const b64 = (images as Record<string, string>)[key];
      if (!b64) throw new Error(`image ${key} missing`);
      const filename = `${randomUUID()}.png`;
      const dir = path.join(process.cwd(), "public", "uploads", "illustrations");
      await mkdir(dir, { recursive: true });
      writtenFile = path.join(dir, filename);
      await writeFile(writtenFile, Buffer.from(b64, "base64"));
      imageUrl = `/api/uploads/illustrations/${filename}`;
    }

    const { rows: created } = await client.query<{ id: string; slug: string }>(
      `INSERT INTO disease (canonical_name, slug, topic_id, status) VALUES ($1, $2, $3, 'draft') RETURNING id, slug`,
      [NAME, slug, topic.id]
    );
    const diseaseId = created[0].id;
    for (let i = 0; i < BLOCKS.length; i++) {
      const b = BLOCKS[i];
      let cc = b.content;
      if (b.type === "simple_image") {
        const { __image, ...rest } = cc;
        void __image;
        cc = { ...rest, imageUrl, imageWidth: "2/3", imageFit: "original" };
      }
      await client.query(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, $3::editorial_block_type, $4)`,
        [diseaseId, (i + 1) * 10, b.type, JSON.stringify(cc)]
      );
    }
    await client.query("COMMIT");

    // updateTag (what the server actions use) is Server-Action-only.
    revalidateTag("library-tree", { expire: 0 });
    revalidatePath("/[locale]", "layout");
    return NextResponse.json({ ok: true, created: created[0], imageUrl, plan });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (writtenFile) await rm(writtenFile, { force: true }).catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
