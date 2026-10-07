import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the rotatores summary comparison table to the Spine
// Anatomy page's Rotators subsubsection on production. GET is a
// read-only dump of that subsubsection's blocks; POST inserts the table
// exactly once, only inside that subsubsection's own range, and does
// nothing if the table is already there. Remove this route once run.

const SLUG = "spine-anatomy";
const HEADING = /^\s*(\d+(\.\d+)*\s*)?rotat\w*\s*$/i;
const HEADING_TYPES = ["section_heading", "subsection_heading", "subsubsection_heading"];
const MARKER = "Fibre direction";

const COLUMNS = ["", "Detail"];

const ROWS: string[][] = [
  ["<strong>Origin</strong>", "<strong>Transverse process</strong> of a vertebra"],
  [
    "<strong>Insertion</strong>",
    "<strong>Lamina and base of the spinous process</strong> of the vertebra <strong>one or two above</strong>",
  ],
  [
    "<strong>Two forms</strong>",
    "<strong>Rotatores breves</strong> — span <strong>one</strong> segment. <strong>Rotatores longi</strong> — span <strong>two</strong>",
  ],
  ["<strong>Fibre direction</strong>", "Obliquely <strong>upward and medially</strong> (like all transversospinalis)"],
  ["<strong>Innervation</strong>", "<strong>Dorsal rami</strong>"],
  ["<strong>Best developed</strong>", "<strong>Thoracic spine</strong> — rudimentary or absent in cervical and lumbar regions"],
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
  if (headings.length !== 1) return { error: `expected exactly one Rotators heading, found ${headings.length}` as const };

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
    return NextResponse.json({ ok: false, error: "afterPosition is outside the Rotators subsubsection" }, { status: 400 });
  }

  const already = range.inRange.find((b) => b.block_type === "comparison_table" && JSON.stringify(b.content_config).includes(MARKER));
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
      [range.diseaseId, afterPosition + 1, JSON.stringify({ columns: COLUMNS, rows: ROWS })]
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
