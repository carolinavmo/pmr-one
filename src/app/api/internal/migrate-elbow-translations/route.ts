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

    // The two sequences can drift (an admin edit landed on elbow-anatomy
    // after this locale's translation snapshot was taken) — a strict
    // positional zip would silently misattribute every block after the
    // drift point (the exact V7 bug class this app already hit once).
    // Instead, find the longest common prefix/suffix of the block_type
    // sequences; if everything outside that window is a pure insertion
    // on one side (no genuine substitution), the alignment is
    // unambiguous and the extra block(s) are simply skipped (no
    // translation stored for a block that no longer exists, or vice
    // versa — for locale's block that source doesn't have).
    const sourceTypes = alignedSource.map((b) => b.block_type);
    const targetTypes = targetBlocks.map((b) => b.block_type);
    let prefix = 0;
    while (
      prefix < sourceTypes.length &&
      prefix < targetTypes.length &&
      sourceTypes[prefix] === targetTypes[prefix]
    ) {
      prefix++;
    }
    let suffix = 0;
    while (
      suffix < sourceTypes.length - prefix &&
      suffix < targetTypes.length - prefix &&
      sourceTypes[sourceTypes.length - 1 - suffix] === targetTypes[targetTypes.length - 1 - suffix]
    ) {
      suffix++;
    }
    const sourceMidLen = sourceTypes.length - prefix - suffix;
    const targetMidLen = targetTypes.length - prefix - suffix;

    if (sourceMidLen !== 0 || targetMidLen !== targetTypes.length - sourceTypes.length) {
      results[locale] = {
        ok: false,
        error: "unresolvable type sequence drift",
        prefix,
        suffix,
        sourceMidLen,
        targetMidLen,
        sourceMidSample: sourceTypes.slice(prefix, sourceTypes.length - suffix),
        targetMidSample: targetTypes.slice(prefix, targetTypes.length - suffix),
      };
      continue;
    }

    // Pure insertion on the target side: pair prefix 1:1, skip
    // target's extra middle block(s) entirely, pair suffix 1:1.
    const pairs: { source: (typeof alignedSource)[number]; target: (typeof targetBlocks)[number] }[] =
      [];
    for (let i = 0; i < prefix; i++) pairs.push({ source: alignedSource[i], target: targetBlocks[i] });
    for (let i = 0; i < suffix; i++) {
      pairs.push({
        source: alignedSource[sourceTypes.length - suffix + i],
        target: targetBlocks[targetTypes.length - suffix + i],
      });
    }

    let written = 0;
    for (const { source, target } of pairs) {
      const sourceHash = createHash("sha256").update(JSON.stringify(source.content_config)).digest("hex");
      await pool.query(
        `INSERT INTO editorial_block_translation (block_id, locale, content_config, source_hash, status)
         VALUES ($1, $2, $3, $4, 'machine')
         ON CONFLICT (block_id, locale) DO UPDATE
           SET content_config = EXCLUDED.content_config,
               source_hash = EXCLUDED.source_hash,
               translated_at = now()`,
        [source.id, locale, target.content_config, sourceHash]
      );
      written++;
    }
    results[locale] = {
      ok: true,
      written,
      skippedTargetBlocks: targetMidLen,
      skippedTargetTypes: targetTypes.slice(prefix, targetTypes.length - suffix),
    };
  }

  return NextResponse.json({ ok: true, sourceBlockCount: sourceBlocks.length, alignedSourceCount: alignedSource.length, results });
}
