import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — finds table blocks on the Rotator cuff tendinopathy page whose
// title is just a stray "<br>" (stored as literal text, so it renders as
// "<br>") and clears that title. Only titles that are nothing but a <br>
// (plain or HTML-escaped) are touched. POST {dryRun:true} reports what it
// found without writing. Remove once run.

interface Row {
  id: string;
  position: number;
  block_type: string;
  content_config: Record<string, unknown> | null;
}

const isStrayBr = (v: unknown) => {
  if (typeof v !== "string") return false;
  const t = v.replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;/gi, " ").replace(/\s+/g, "");
  return /^(<br\/?>)+$/i.test(t);
};

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(
      `SELECT d.id FROM disease d JOIN topic t ON t.id = d.topic_id WHERE t.name = 'Shoulder' AND lower(d.canonical_name) = 'rotator cuff tendinopathy'`
    );
    if (d.length !== 1) throw new Error(`expected one page, found ${d.length}`);
    const { rows } = await client.query<Row>(
      `SELECT id, position, block_type::text AS block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position FOR UPDATE`,
      [d[0].id]
    );

    const tables = rows.filter((r) => ["rich_table", "highlight_table", "comparison_table"].includes(r.block_type));
    const found = tables
      .filter((r) => isStrayBr(r.content_config?.title) || isStrayBr(r.content_config?.caption))
      .map((r) => ({ id: r.id, position: r.position, type: r.block_type, title: r.content_config?.title ?? null, caption: r.content_config?.caption ?? null }));
    // for context when nothing matches: every table that has a title, with its raw value
    const titled = tables
      .filter((r) => typeof r.content_config?.title === "string" && String(r.content_config?.title).length > 0)
      .map((r) => ({ position: r.position, type: r.block_type, title: String(r.content_config?.title).slice(0, 60) }));

    if (dryRun || found.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: !!dryRun, found, titled });
    }

    for (const f of found) {
      const key = isStrayBr(f.title) ? "title" : "caption";
      await client.query(`UPDATE editorial_block SET content_config = jsonb_set(content_config, ARRAY[$2::text], '""'::jsonb) WHERE id = $1`, [f.id, key]);
    }
    await client.query("COMMIT");
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, cleared: found });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
