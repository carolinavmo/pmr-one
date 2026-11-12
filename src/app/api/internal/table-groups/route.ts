import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// TEMPORARY — tables used to show any row with text only in its first cell
// as a group-label band automatically; that is now a per-table option
// (groupRows). This switches it on for every table that currently has such a
// row, so nothing changes visually. The Distal Clavicular Osteolysis page is
// skipped (a half-filled row there was the bug being fixed). POST {dryRun:true}
// lists the tables without changing anything. Remove once run.

const strip = (s: unknown) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string; slug: string; position: number; content_config: { rows?: string[][]; groupRows?: boolean } }>(
      `SELECT b.id, d.slug, b.position, b.content_config FROM editorial_block b JOIN disease d ON d.id = b.disease_id WHERE b.block_type = 'comparison_table'`
    );
    const targets = rows.filter(
      (t) =>
        t.slug !== "distal-clavicular-osteolysis" &&
        t.content_config.groupRows !== true &&
        (t.content_config.rows ?? []).some((r) => r.length > 1 && strip(r[0]) !== "" && r.slice(1).every((c) => strip(c) === ""))
    );
    const summary = targets.map((t) => ({ slug: t.slug, position: t.position }));
    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, tablesTotal: rows.length, targets: summary });
    }
    for (const t of targets) {
      await client.query(`UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY['groupRows'], 'true'::jsonb) WHERE id = $1`, [t.id]);
    }
    await client.query("COMMIT");
    revalidateShellSurfaces();
    revalidateTag("library-tree", { expire: 0 });
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, updated: summary });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
