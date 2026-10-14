import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — turns the Spine Anatomy "7.9 Review — the muscles at a
// glance" table into a banded table: drops the now-redundant "Group"
// column and inserts a separator row (label in the first cell, the rest
// empty — rendered as a full-width band) before each group. It reads the
// table's CURRENT rows from the database rather than retyping them, so
// any edits made since it was added are kept. Runs once (does nothing if
// the table is already banded). POST {dryRun:true} reports without
// writing. Remove this route once run.

const SLUG = "spine-anatomy";
const MARKER = "Least clinically important back muscles";

// A separator goes in front of the first row whose first cell starts with
// the given text (rows after it belong to that group until the next one).
const SEPARATORS: { before: string; label: string }[] = [
  { before: "Trapezius", label: "Back muscles — superficial group (extrinsic)" },
  { before: "Serratus posterior", label: "Back muscles — intermediate group" },
  { before: "Splenius", label: "Back muscles — deep group · spinotransverse (splenii)" },
  { before: "Erector spinae", label: "Back muscles — deep group · erector spinae" },
  { before: "Semispinalis", label: "Back muscles — deep group · transversospinalis" },
  { before: "Interspinales", label: "Back muscles — deep group · segmental muscles" },
  { before: "Suboccipital muscles", label: "Back muscles — deep group · suboccipital muscles" },
  { before: "Longus colli", label: "Neck — deep cervical flexors" },
  { before: "External oblique", label: "Anterior and lateral trunk" },
  { before: "Scalenus", label: "Neck — scalenes and sternocleidomastoid" },
];

const plain = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(`SELECT id FROM disease WHERE slug = $1`, [SLUG]);
    const diseaseId = d[0]?.id;
    if (!diseaseId) throw new Error("disease not found");

    const { rows } = await client.query<{ id: string; position: number; content_config: { columns?: string[]; rows?: string[][] } }>(
      `SELECT id, position, content_config FROM editorial_block WHERE disease_id = $1 AND block_type = 'comparison_table' ORDER BY position FOR UPDATE`,
      [diseaseId]
    );
    const table = rows.find((r) => JSON.stringify(r.content_config).includes(MARKER));
    if (!table) throw new Error("review table not found");

    const columns = table.content_config.columns ?? [];
    const dataRows = table.content_config.rows ?? [];
    if (columns.length !== 5 || plain(columns[1]) !== "Group") {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "table is not in the original 5-column shape (already banded or edited)", columns });
    }

    const nextColumns = [columns[0], columns[2], columns[3], columns[4]];
    const nextRows: string[][] = [];
    const placed: string[] = [];
    const used = new Set<number>();
    for (const row of dataRows) {
      const first = plain(row[0] ?? "");
      const sepIdx = SEPARATORS.findIndex((s, i) => !used.has(i) && first.startsWith(s.before));
      if (sepIdx >= 0) {
        used.add(sepIdx);
        nextRows.push([SEPARATORS[sepIdx].label, "", "", ""]);
        placed.push(`${SEPARATORS[sepIdx].label}  ⟵ before "${first.slice(0, 30)}"`);
      }
      nextRows.push([row[0], row[2], row[3], row[4]]);
    }
    const missing = SEPARATORS.filter((_, i) => !used.has(i)).map((s) => s.label);

    const plan = { position: table.position, dataRows: dataRows.length, resultRows: nextRows.length, separators: placed, separatorsNotPlaced: missing };
    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }

    // Same whole-array replace updateComparisonTableAction does.
    await client.query(
      `UPDATE editorial_block SET content_config = content_config || jsonb_build_object('columns', $2::jsonb, 'rows', $3::jsonb) WHERE id = $1`,
      [table.id, JSON.stringify(nextColumns), JSON.stringify(nextRows)]
    );
    await client.query("COMMIT");
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, plan });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
