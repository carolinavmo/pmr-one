import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool } from "@/lib/db";

// One-time migration: move the 3 standalone translated Elbow Anatomy
// disease rows (elbow-anatomy-es/-pt-pt/-pt-br) into
// editorial_block_translation rows keyed to the ORIGINAL elbow-anatomy
// disease's real block ids, so getDiseaseBySlug(slug, locale) can serve
// them under the same slug. Idempotent (ON CONFLICT DO UPDATE on the
// (block_id, locale) unique key) and read-verifies alignment per
// language before writing anything for that language.
const LANGS: { slug: string; locale: string }[] = [
  { slug: "elbow-anatomy-es", locale: "es" },
  { slug: "elbow-anatomy-pt-pt", locale: "pt-pt" },
  { slug: "elbow-anatomy-pt-br", locale: "pt-br" },
];

function isSkippedEmptySimpleImage(blockType: string, cc: Record<string, unknown>) {
  return blockType === "simple_image" && !cc.imageUrl && !cc.caption;
}

export async function GET() {
  const { rows: sourceDisease } = await pool.query(
    `SELECT id FROM disease WHERE slug = 'elbow-anatomy'`
  );
  if (!sourceDisease[0]) {
    return NextResponse.json({ ok: false, error: "source disease not found" }, { status: 404 });
  }
  const sourceId = sourceDisease[0].id as string;

  const { rows: sourceBlocks } = await pool.query(
    `SELECT id, position, block_type, content_config FROM editorial_block
     WHERE disease_id = $1 ORDER BY position`,
    [sourceId]
  );
  const alignedSource = sourceBlocks.filter(
    (b) => !isSkippedEmptySimpleImage(b.block_type, b.content_config ?? {})
  );

  const results: Record<string, unknown> = {};

  for (const { slug, locale } of LANGS) {
    const { rows: targetDisease } = await pool.query(`SELECT id FROM disease WHERE slug = $1`, [
      slug,
    ]);
    if (!targetDisease[0]) {
      results[locale] = { ok: false, error: "translated disease not found" };
      continue;
    }
    const { rows: targetBlocks } = await pool.query(
      `SELECT id, position, block_type, content_config FROM editorial_block
       WHERE disease_id = $1 ORDER BY position`,
      [targetDisease[0].id]
    );

    if (targetBlocks.length !== alignedSource.length) {
      results[locale] = {
        ok: false,
        error: "count mismatch",
        sourceCount: alignedSource.length,
        targetCount: targetBlocks.length,
      };
      continue;
    }

    const mismatches: { index: number; sourceType: string; targetType: string }[] = [];
    for (let i = 0; i < alignedSource.length; i++) {
      if (alignedSource[i].block_type !== targetBlocks[i].block_type) {
        mismatches.push({
          index: i,
          sourceType: alignedSource[i].block_type,
          targetType: targetBlocks[i].block_type,
        });
      }
    }
    if (mismatches.length > 0) {
      results[locale] = { ok: false, error: "type sequence mismatch", mismatches };
      continue;
    }

    let written = 0;
    for (let i = 0; i < alignedSource.length; i++) {
      const sourceBlockId = alignedSource[i].id;
      const translatedConfig = targetBlocks[i].content_config;
      const sourceHash = createHash("sha256")
        .update(JSON.stringify(alignedSource[i].content_config))
        .digest("hex");
      await pool.query(
        `INSERT INTO editorial_block_translation (block_id, locale, content_config, source_hash, status)
         VALUES ($1, $2, $3, $4, 'machine')
         ON CONFLICT (block_id, locale) DO UPDATE
           SET content_config = EXCLUDED.content_config,
               source_hash = EXCLUDED.source_hash,
               translated_at = now()`,
        [sourceBlockId, locale, translatedConfig, sourceHash]
      );
      written++;
    }
    results[locale] = { ok: true, written };
  }

  return NextResponse.json({ ok: true, sourceBlockCount: sourceBlocks.length, alignedSourceCount: alignedSource.length, results });
}
