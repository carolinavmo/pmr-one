import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { revalidateDiseaseSurfaces } from "@/lib/revalidation";

// One-time production insert: adds "The Beaton classification of
// variants" table to the end of the existing "Relationship with the
// sciatic nerve" subsubsection on hip-anatomy (4.5 The deep external
// rotators). rich_table, not comparison_table — its dedicated `title`
// field matches the bold, larger title styling requested, and
// showBadgeColumn: false since the Type column (A-F) already serves
// as the row identifier — a numbered badge alongside it would be
// redundant. Idempotent: no-ops if a block with this exact title
// already exists.
const NEW_BLOCK = {
  type: "rich_table",
  content_config: {
    title: "The Beaton classification of variants",
    badgeColumnTitle: "",
    showBadgeColumn: false,
    columns: [
      { title: "Type", type: "text" },
      { title: "Arrangement", type: "text" },
      { title: "Approximate frequency", type: "text" },
    ],
    rows: [
      {
        cells: [
          "<strong>A</strong>",
          "Undivided nerve <strong>below</strong> an undivided piriformis — <strong>the normal pattern</strong>",
          "<strong>~85%</strong>",
        ],
      },
      {
        cells: [
          "<strong>B</strong>",
          "Nerve divides; <strong>peroneal division through</strong> the muscle, tibial division below",
          "~10%",
        ],
      },
      {
        cells: [
          "<strong>C</strong>",
          "Nerve divides; <strong>peroneal division above</strong> the muscle, tibial division below",
          "~2–3%",
        ],
      },
      {
        cells: ["<strong>D</strong>", "<strong>Undivided nerve passes through</strong> the muscle", "rare"],
      },
      {
        cells: ["<strong>E</strong>", "Undivided nerve above an undivided piriformis", "very rare"],
      },
      {
        cells: ["<strong>F</strong>", "Nerve divides above, both divisions through or around", "very rare"],
      },
    ],
  },
};

export async function GET() {
  const { rows: diseaseRows } = await pool.query(`SELECT id FROM disease WHERE slug = 'hip-anatomy'`);
  const diseaseId = diseaseRows[0]?.id;
  if (!diseaseId) return NextResponse.json({ ok: false, error: "disease not found" }, { status: 404 });

  const { rows: blocks } = await pool.query(
    `SELECT id, position, block_type, content_config
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );

  if (
    blocks.some(
      (b) => b.block_type === "rich_table" && b.content_config?.title === NEW_BLOCK.content_config.title
    )
  ) {
    return NextResponse.json({ ok: true, alreadyApplied: true });
  }

  const headingIdx = blocks.findIndex(
    (b) =>
      b.block_type === "subsubsection_heading" &&
      String(b.content_config?.text ?? "").toLowerCase() === "relationship with the sciatic nerve"
  );
  if (headingIdx === -1) {
    return NextResponse.json(
      { ok: false, error: "'Relationship with the sciatic nerve' subsubsection not found" },
      { status: 404 }
    );
  }

  let endIdx = blocks.length;
  for (let i = headingIdx + 1; i < blocks.length; i++) {
    if (["section_heading", "subsection_heading", "subsubsection_heading"].includes(blocks[i].block_type)) {
      endIdx = i;
      break;
    }
  }
  const lastBlockInSubsubsection = blocks[endIdx - 1];
  const nextPosition = endIdx < blocks.length ? blocks[endIdx].position : null;

  const newPosition =
    nextPosition === null
      ? lastBlockInSubsubsection.position + 10
      : Math.floor((lastBlockInSubsubsection.position + nextPosition) / 2);

  if (newPosition <= lastBlockInSubsubsection.position || (nextPosition !== null && newPosition >= nextPosition)) {
    return NextResponse.json(
      {
        ok: false,
        error: "No position gap available to insert into — aborting without changing anything",
        lastBlockPosition: lastBlockInSubsubsection.position,
        nextPosition,
      },
      { status: 409 }
    );
  }

  await pool.query(
    `INSERT INTO editorial_block (disease_id, position, block_type, content_config)
     VALUES ($1, $2, $3, $4)`,
    [diseaseId, newPosition, NEW_BLOCK.type, NEW_BLOCK.content_config]
  );

  revalidateDiseaseSurfaces();

  return NextResponse.json({
    ok: true,
    insertedAtPosition: newPosition,
    afterBlockId: lastBlockInSubsubsection.id,
    beforePosition: nextPosition,
  });
}
