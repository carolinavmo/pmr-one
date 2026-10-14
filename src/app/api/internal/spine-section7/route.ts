import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY, READ-ONLY — dumps the Spine Anatomy page's Section 7 block
// layout on production so new subsections can be placed correctly.
// Remove this route once read.

export async function GET() {
  const { rows: d } = await pool.query<{ id: string }>(`SELECT id FROM disease WHERE slug = 'spine-anatomy'`);
  const diseaseId = d[0]?.id;
  if (!diseaseId) return NextResponse.json({ ok: false }, { status: 404 });

  const { rows } = await pool.query<{ position: number; block_type: string; display_config: unknown; content_config: Record<string, unknown> | null }>(
    `SELECT position, block_type::text AS block_type, display_config, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );
  const strip = (s: unknown) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const start = rows.findIndex((r) => r.block_type === "section_heading" && /muscles/i.test(strip(r.content_config?.text)));
  if (start < 0) return NextResponse.json({ ok: false, error: "no muscles section" }, { status: 404 });
  const nextSec = rows.findIndex((r, i) => i > start && r.block_type === "section_heading");
  const slice = rows.slice(start, nextSec < 0 ? undefined : nextSec + 1);

  return NextResponse.json({
    ok: true,
    totalBlocks: rows.length,
    blocks: slice.map((r) => {
      const c = r.content_config ?? {};
      const layout = (r.display_config as { layout?: { row?: string; width?: string } } | null)?.layout;
      const text = strip(c.text ?? c.body ?? c.paragraph ?? c.label ?? (Array.isArray(c.columns) ? (c.columns as string[]).join(" | ") : ""));
      return {
        p: r.position,
        t: r.block_type,
        row: layout?.row ? layout.row.slice(0, 4) + ":" + (layout.width ?? "") : undefined,
        label: c.label ? strip(c.label) : undefined,
        text: text.slice(0, 90),
      };
    }),
  });
}
