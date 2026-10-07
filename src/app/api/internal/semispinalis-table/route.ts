import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the "Semispinalis — the three parts" comparison table
// to the Spine Anatomy page's Semispinalis subsubsection on production.
// GET is a read-only dump of that subsubsection's blocks; POST inserts
// the table exactly once, only inside that subsubsection's own range, and
// does nothing if the table is already there. Remove this route once run.

const SLUG = "spine-anatomy";
const HEADING = /^\s*(\d+(\.\d+)*\s*)?semispinalis\s*$/i;
const HEADING_TYPES = ["section_heading", "subsection_heading", "subsubsection_heading"];

const CAPTION = "Semispinalis — the three parts";

const COLUMNS = ["", "Semispinalis thoracis", "Semispinalis cervicis", "Semispinalis capitis"];

const ROWS: string[][] = [
  [
    "<strong>Origin</strong>",
    "Transverse processes <strong>T6–T10</strong>",
    "Transverse processes <strong>T1–T6</strong>",
    "Transverse processes <strong>C7–T6</strong> + articular processes <strong>C4–C6</strong>",
  ],
  [
    "<strong>Insertion</strong>",
    "Spinous processes <strong>C6–T4</strong>",
    "Spinous processes <strong>C2–C5</strong> — chiefly the <strong>axis (C2)</strong>",
    "Occiput, <strong>between the superior and inferior nuchal lines</strong>",
  ],
  ["<strong>Innervation</strong>", "Dorsal rami", "Dorsal rami", "Dorsal rami"],
  [
    "<strong>Action — bilateral</strong>",
    "Extends the thoracic spine",
    "Extends the cervical spine",
    "<strong>Major extensor of head and neck</strong>",
  ],
  [
    "<strong>Action — unilateral</strong>",
    "<strong>Contralateral</strong> rotation",
    "<strong>Contralateral</strong> rotation",
    "Contralateral rotation (minor role)",
  ],
  [
    "<strong>Build</strong>",
    "Thin, largely tendinous",
    "Moderate; thick C2 attachment",
    "<strong>Large and fleshy</strong> — bulk of the posterior neck",
  ],
  [
    "<strong>Clinical weight</strong>",
    "Low",
    "<strong>C2 attachment</strong> — detaching it in posterior cervical surgery causes kyphosis and axial neck pain",
    "<strong>Greater occipital nerve pierces it</strong> → occipital neuralgia, GON block site",
  ],
];

interface BlockRow {
  id: string;
  position: number;
  block_type: string;
  display_config: unknown;
  content_config: Record<string, unknown> | null;
}

async function loadRange() {
  const { rows: diseaseRows } = await pool.query<{ id: string }>(`SELECT id FROM disease WHERE slug = $1`, [SLUG]);
  const diseaseId = diseaseRows[0]?.id;
  if (!diseaseId) return { error: "disease not found" as const };

  const { rows } = await pool.query<BlockRow>(
    `SELECT id, position, block_type, display_config, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );
  const headings = rows.filter(
    (r) => r.block_type === "subsubsection_heading" && HEADING.test(String(r.content_config?.text ?? "").replace(/<[^>]*>/g, ""))
  );
  if (headings.length !== 1) return { error: `expected exactly one Semispinalis heading, found ${headings.length}` as const };

  const heading = headings[0];
  const next = rows.find((r) => r.position > heading.position && HEADING_TYPES.includes(r.block_type));
  const rangeEnd = next ? next.position : Number.MAX_SAFE_INTEGER;
  const inRange = rows.filter((r) => r.position >= heading.position && r.position < rangeEnd);
  return { diseaseId, heading, rangeEnd, inRange };
}

export async function GET() {
  const range = await loadRange();
  if ("error" in range) return NextResponse.json({ ok: false, error: range.error }, { status: 404 });
  return NextResponse.json({
    ok: true,
    headingPosition: range.heading.position,
    rangeEnd: range.rangeEnd,
    blocks: range.inRange.map((b) => ({
      position: b.position,
      type: b.block_type,
      displayConfig: b.display_config,
      preview: JSON.stringify(b.content_config).slice(0, 140),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { afterPosition } = (await req.json()) as { afterPosition?: number };
  if (typeof afterPosition !== "number") return NextResponse.json({ ok: false, error: "afterPosition required" }, { status: 400 });

  const range = await loadRange();
  if ("error" in range) return NextResponse.json({ ok: false, error: range.error }, { status: 404 });

  if (afterPosition < range.heading.position || afterPosition >= range.rangeEnd) {
    return NextResponse.json({ ok: false, error: "afterPosition is outside the Semispinalis subsubsection" }, { status: 400 });
  }

  const already = range.inRange.find(
    (b) => b.block_type === "comparison_table" && JSON.stringify(b.content_config).includes("Semispinalis thoracis")
  );
  if (already) return NextResponse.json({ ok: true, skipped: true, existingPosition: already.position });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Same two-pass shift insertBlockAction's makeRoomAfter uses — the
    // (disease_id, position) unique constraint rules out a single UPDATE.
    await client.query(`UPDATE editorial_block SET position = -(position + 1) WHERE disease_id = $1 AND position > $2`, [
      range.diseaseId,
      afterPosition,
    ]);
    await client.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1 AND position < 0`, [range.diseaseId]);
    const { rows } = await client.query<{ id: string; position: number }>(
      `INSERT INTO editorial_block (disease_id, position, block_type, content_config)
       VALUES ($1, $2, 'comparison_table', $3) RETURNING id, position`,
      [range.diseaseId, afterPosition + 1, JSON.stringify({ caption: CAPTION, columns: COLUMNS, rows: ROWS })]
    );
    await client.query("COMMIT");
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, inserted: rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  } finally {
    client.release();
  }
}
