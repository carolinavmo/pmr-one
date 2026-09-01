import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Read-only: checks whether created_at reliably separates the 72
// blocks this session inserted (all in one transaction, so Postgres's
// now() should give them one identical or near-identical timestamp)
// from the genuine old section-7/Rapid-Revision tail content — a
// content-match classifier breaks once a block has been admin-edited
// since insertion (confirmed: 5 of the 72 were), but an UPDATE never
// touches created_at.
export async function GET() {
  const { rows: diseaseRows } = await pool.query(`SELECT id FROM disease WHERE slug = 'elbow-anatomy'`);
  const diseaseId = diseaseRows[0]?.id;
  if (!diseaseId) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const { rows: blocks } = await pool.query(
    `SELECT id, position, block_type, created_at, content_config
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );

  const neuroIdx = blocks.findIndex(
    (b) => b.block_type === "section_heading" && String(b.content_config?.text ?? "").includes("Neuroanatomy")
  );

  const afterNeuro = blocks.slice(neuroIdx + 1);
  const byTimestamp = new Map<string, number>();
  for (const b of afterNeuro) {
    const key = new Date(b.created_at).toISOString();
    byTimestamp.set(key, (byTimestamp.get(key) ?? 0) + 1);
  }
  const clusters = [...byTimestamp.entries()].sort((a, b) => b[1] - a[1]);

  return NextResponse.json({
    ok: true,
    afterNeuroCount: afterNeuro.length,
    distinctTimestamps: clusters.length,
    topClusters: clusters.slice(0, 10),
  });
}
