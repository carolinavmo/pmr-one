import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { revalidateDiseaseSurfaces } from "@/lib/revalidation";
import newBlocks from "./blocks.json";

// One-time production replacement of the elbow-anatomy page's "6.
// Neuroanatomy" section content (everything between that heading and
// the next section_heading) with content imported from
// Elbow-Innervation-PMR.docx — same conversion pipeline as the Knee
// Anatomy import, spliced one level deeper (doc H1 -> subsection "6.N",
// doc H2 -> subsubsection "6.N.M") since it's replacing the inside of
// an existing section, not becoming its own page. The "6. Neuroanatomy"
// heading itself is kept as-is; only what's under it is swapped.
//
// Idempotent: if the section's first child already matches the new
// content's first subsection heading, this is a no-op.
export async function GET() {
  const { rows: diseaseRows } = await pool.query(`SELECT id FROM disease WHERE slug = 'elbow-anatomy'`);
  if (!diseaseRows[0]) {
    return NextResponse.json({ ok: false, error: "elbow-anatomy not found" }, { status: 404 });
  }
  const diseaseId = diseaseRows[0].id;

  const { rows: blocks } = await pool.query(
    `SELECT id, position, block_type, content_config
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );

  const neuroIdx = blocks.findIndex(
    (b) => b.block_type === "section_heading" && String(b.content_config?.text ?? "").includes("Neuroanatomy")
  );
  if (neuroIdx === -1) {
    return NextResponse.json({ ok: false, error: "Neuroanatomy section not found" }, { status: 404 });
  }

  let nextSectionIdx = -1;
  for (let i = neuroIdx + 1; i < blocks.length; i++) {
    if (blocks[i].block_type === "section_heading") {
      nextSectionIdx = i;
      break;
    }
  }
  const nextPosition = nextSectionIdx === -1 ? null : blocks[nextSectionIdx].position;

  const typedNewBlocks = newBlocks as { type: string; content_config: Record<string, unknown> }[];
  const firstNewHeadingText = typedNewBlocks[0]?.content_config?.text;
  const currentFirstChild = blocks[neuroIdx + 1];
  if (
    currentFirstChild &&
    currentFirstChild.block_type === "subsection_heading" &&
    currentFirstChild.content_config?.text === firstNewHeadingText
  ) {
    return NextResponse.json({ ok: true, alreadyApplied: true });
  }

  const neuroHeadingPosition = blocks[neuroIdx].position;
  const beforePosition = neuroIdx > 0 ? blocks[neuroIdx - 1].position : neuroHeadingPosition - 10;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Remove every block strictly after the "6. Neuroanatomy" heading
    // up to (not including) the next section — the heading itself
    // stays untouched.
    if (nextPosition === null) {
      await client.query(
        `DELETE FROM editorial_block WHERE disease_id = $1 AND position > $2`,
        [diseaseId, neuroHeadingPosition]
      );
    } else {
      await client.query(
        `DELETE FROM editorial_block WHERE disease_id = $1 AND position > $2 AND position < $3`,
        [diseaseId, neuroHeadingPosition, nextPosition]
      );
    }

    let cursor = neuroHeadingPosition;
    for (const block of typedNewBlocks) {
      cursor += 10;
      await client.query(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config)
         VALUES ($1, $2, $3, $4)`,
        [diseaseId, cursor, block.type, block.content_config]
      );
    }

    // Shift everything from the next section onward so it never
    // collides with the freshly inserted range, regardless of how many
    // blocks were just added.
    if (nextSectionIdx !== -1) {
      const { rows: tailRows } = await client.query(
        `SELECT id FROM editorial_block WHERE disease_id = $1 AND position >= $2 ORDER BY position`,
        [diseaseId, nextPosition]
      );
      let tailCursor = cursor;
      for (const row of tailRows) {
        tailCursor += 10;
        await client.query(`UPDATE editorial_block SET position = $1 WHERE id = $2`, [tailCursor, row.id]);
      }
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
    diseaseId,
    replacedCount: nextSectionIdx === -1 ? blocks.length - neuroIdx - 1 : nextSectionIdx - neuroIdx - 1,
    insertedCount: typedNewBlocks.length,
    beforePosition,
  });
}
