import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY read-only probe: which table rows have odd markup or look like
// separator rows. Remove once read.

const strip = (s: unknown) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function POST() {
  const { rows } = await pool.query<{ id: string; slug: string; position: number; content_config: { columns: string[]; rows: string[][]; hideHeader?: boolean } }>(
    `SELECT b.id, d.slug, b.position, b.content_config FROM editorial_block b JOIN disease d ON d.id = b.disease_id WHERE b.block_type = 'comparison_table' ORDER BY d.slug, b.position`
  );
  const out: unknown[] = [];
  for (const t of rows) {
    const cols = t.content_config.columns ?? [];
    const rs = t.content_config.rows ?? [];
    const odd: unknown[] = [];
    rs.forEach((r, i) => {
      const html = r.join("");
      const separator = r.length > 1 && strip(r[0]) !== "" && r.slice(1).every((c) => strip(c) === "");
      const tags = [...new Set((html.match(/<\/?[a-z0-9]+[^>]*>/gi) ?? []).map((x) => x.replace(/^<\/?([a-z0-9]+).*$/i, "$1").toLowerCase()))];
      const unusual = tags.filter((x) => !["strong", "em", "br"].includes(x));
      if (separator || unusual.length || r.length !== cols.length) odd.push({ row: i, separator, unusual, cells: r.length, html: r.map((c) => c.slice(0, 160)) });
    });
    if (odd.length) out.push({ slug: t.slug, position: t.position, cols: cols.length, rowsCount: rs.length, odd });
  }
  return NextResponse.json({ ok: true, tables: rows.length, flagged: out });
}
