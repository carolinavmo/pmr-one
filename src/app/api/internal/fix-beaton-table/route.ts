import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { revalidateDiseaseSurfaces } from "@/lib/revalidation";

// One-time production correction: replaces the rows of "The Beaton
// classification of variants" rich_table (hip-anatomy) with the more
// detailed 6-type version the founder provided — Roman-numeral+letter
// dual naming (I (A)...VI (F)), revised arrangement wording, and
// revised frequency figures. Title/columns/showBadgeColumn are
// unchanged; only `rows` is replaced. Locates the block by its exact
// title rather than a hardcoded id. Idempotent: no-ops if the first
// row's Type cell already reads "I (A)".
const NEW_ROWS = [
  {
    cells: [
      "<strong>I (A)</strong>",
      "Undivided nerve <strong>below</strong> an undivided piriformis — <strong>the normal pattern</strong>",
      "<strong>~83–85%</strong>",
    ],
  },
  {
    cells: [
      "<strong>II (B)</strong>",
      "<strong>Peroneal division through</strong> the muscle, tibial division <strong>below</strong>",
      "~10–14%",
    ],
  },
  {
    cells: [
      "<strong>III (C)</strong>",
      "<strong>Peroneal division above</strong> the muscle, tibial division <strong>below</strong>",
      "~1%",
    ],
  },
  {
    cells: ["<strong>IV (D)</strong>", "<strong>Undivided nerve passes through</strong> the muscle", "<1%"],
  },
  {
    cells: [
      "<strong>V (E)</strong>",
      "<strong>Peroneal division above</strong> the muscle, <strong>tibial division through</strong> it",
      "very rare (<0.1%)",
    ],
  },
  {
    cells: ["<strong>VI (F)</strong>", "<strong>Undivided nerve passes above</strong> the muscle", "very rare (<1%)"],
  },
];

const TABLE_TITLE_SUBSTRING = "beaton classification of variants";

export async function GET() {
  const { rows: diseaseRows } = await pool.query(`SELECT id FROM disease WHERE slug = 'hip-anatomy'`);
  const diseaseId = diseaseRows[0]?.id;
  if (!diseaseId) return NextResponse.json({ ok: false, error: "disease not found" }, { status: 404 });

  const { rows: blocks } = await pool.query(
    `SELECT id, content_config FROM editorial_block WHERE disease_id = $1 AND block_type = 'rich_table'`,
    [diseaseId]
  );
  const block = blocks.find((b) =>
    String(b.content_config?.title ?? "").toLowerCase().includes(TABLE_TITLE_SUBSTRING)
  );
  if (!block) {
    return NextResponse.json(
      {
        ok: false,
        error: "Beaton table not found",
        allRichTableTitles: blocks.map((b) => b.content_config?.title),
      },
      { status: 404 }
    );
  }

  const currentRows = block.content_config.rows as { cells: string[] }[];
  if (currentRows[0]?.cells[0]?.includes("I (A)")) {
    return NextResponse.json({ ok: true, alreadyApplied: true, blockId: block.id });
  }

  await pool.query(
    `UPDATE editorial_block
     SET content_config = content_config || jsonb_build_object('rows', $2::jsonb)
     WHERE id = $1`,
    [block.id, JSON.stringify(NEW_ROWS)]
  );

  revalidateDiseaseSurfaces();

  return NextResponse.json({ ok: true, blockId: block.id, newRows: NEW_ROWS });
}
