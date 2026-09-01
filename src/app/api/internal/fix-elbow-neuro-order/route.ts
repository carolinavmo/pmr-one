import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { revalidateDiseaseSurfaces } from "@/lib/revalidation";
import myBlocks from "./blocks.json";

// Repairs the previous replace-elbow-neuro route's position bug: it
// computed new-block positions as neuroHeadingPosition + 10*N without
// checking whether that range fit before the old next-section position
// (it didn't — 72 blocks * 10 needed 720 units of room, only 282
// existed), so 44 of the 72 new blocks landed past the old "7.
// Vascular Anatomy" heading's position and got swept into the
// tail-renumbering query, interleaving with it by raw position order.
//
// Fix: re-fetch every block from the Neuroanatomy heading onward,
// classify each as "mine" (exact content_config match against the
// known-correct 72 blocks below) or "not mine" (the old section 7 /
// Rapid Revision content, still in correct relative order among
// itself — only its position is wrong, never its content). Delete the
// "mine" rows (disposable — exact replacements are re-inserted from
// this route's own known-good copy) and only ever shift the "not
// mine" rows' position, never their content, id, or anything else.
export async function GET() {
  const { rows: diseaseRows } = await pool.query(`SELECT id FROM disease WHERE slug = 'elbow-anatomy'`);
  const diseaseId = diseaseRows[0]?.id;
  if (!diseaseId) return NextResponse.json({ ok: false, error: "disease not found" }, { status: 404 });

  const { rows: blocks } = await pool.query(
    `SELECT id, position, block_type, content_config
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );

  const neuroIdx = blocks.findIndex(
    (b) => b.block_type === "section_heading" && String(b.content_config?.text ?? "").includes("Neuroanatomy")
  );
  if (neuroIdx === -1) {
    return NextResponse.json({ ok: false, error: "Neuroanatomy heading not found" }, { status: 404 });
  }
  const neuroHeadingPosition = blocks[neuroIdx].position;

  const typedMyBlocks = myBlocks as { type: string; content_config: Record<string, unknown> }[];
  const myMultiset = new Map<string, number>();
  for (const b of typedMyBlocks) {
    const key = b.type + "::" + JSON.stringify(b.content_config);
    myMultiset.set(key, (myMultiset.get(key) ?? 0) + 1);
  }

  const afterNeuro = blocks.slice(neuroIdx + 1);
  const mineIds: string[] = [];
  const tailIds: string[] = [];
  for (const b of afterNeuro) {
    const key = b.block_type + "::" + JSON.stringify(b.content_config);
    const count = myMultiset.get(key) ?? 0;
    if (count > 0) {
      myMultiset.set(key, count - 1);
      mineIds.push(b.id);
    } else {
      tailIds.push(b.id);
    }
  }

  if (mineIds.length !== typedMyBlocks.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "Classification mismatch — aborting without touching anything",
        expectedMine: typedMyBlocks.length,
        foundMine: mineIds.length,
        foundTail: tailIds.length,
      },
      { status: 409 }
    );
  }

  // Already fixed if every "mine" block already sits before every
  // "tail" block AND the "mine" blocks are already in the exact order
  // typedMyBlocks expects.
  const mineIdSet = new Set(mineIds);
  const mineInCurrentOrder = afterNeuro.filter((b) => mineIdSet.has(b.id));
  const mineOrderMatches = mineInCurrentOrder.every(
    (b, i) =>
      b.block_type === typedMyBlocks[i].type &&
      JSON.stringify(b.content_config) === JSON.stringify(typedMyBlocks[i].content_config)
  );
  const firstTailPos = tailIds.length > 0 ? blocks.find((b) => b.id === tailIds[0])!.position : Infinity;
  const lastMinePos = Math.max(...mineInCurrentOrder.map((b) => b.position));
  if (mineOrderMatches && lastMinePos < firstTailPos) {
    return NextResponse.json({ ok: true, alreadyFixed: true });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`DELETE FROM editorial_block WHERE id = ANY($1::uuid[])`, [mineIds]);

    let cursor = neuroHeadingPosition;
    for (const block of typedMyBlocks) {
      cursor += 10;
      await client.query(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config)
         VALUES ($1, $2, $3, $4)`,
        [diseaseId, cursor, block.type, block.content_config]
      );
    }

    for (const id of tailIds) {
      cursor += 10;
      await client.query(`UPDATE editorial_block SET position = $1 WHERE id = $2`, [cursor, id]);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  revalidateDiseaseSurfaces();

  return NextResponse.json({
    ok: true,
    fixed: true,
    mineCount: mineIds.length,
    tailCount: tailIds.length,
  });
}
