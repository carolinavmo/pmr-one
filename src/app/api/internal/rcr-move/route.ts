import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — moves the subsections "The capacity–load model, stated
// properly" and "The spectrum of structural change" from the Introduction
// chapter into the Pathophysiology chapter of the Rotator cuff tendinopathy
// page, directly after that chapter's opening text and before its first
// subsection. Blocks keep their ids; only positions change. Located by
// content, one transaction, FOR UPDATE. POST {dryRun:true} reports the plan.
// Remove once run.

interface Row {
  id: string;
  position: number;
  block_type: string;
  content_config: Record<string, unknown> | null;
}
const strip = (v: unknown) => String(v ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const label = (r: Row) =>
  `${r.position} ${r.block_type}: ${strip(r.content_config?.text ?? r.content_config?.body ?? r.content_config?.label ?? (r.block_type === "comparison_table" ? JSON.stringify(r.content_config?.columns) : "")).slice(0, 55)}`;
const isHead = (r: Row) => r.block_type === "section_heading" || r.block_type === "subsection_heading";
const bare = (r: Row) => strip(r.content_config?.text).replace(/^\d+(\.\d+)*\.?\s+/, "");

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(
      `SELECT d.id FROM disease d JOIN topic t ON t.id = d.topic_id WHERE t.name = 'Shoulder' AND lower(d.canonical_name) = 'rotator cuff tendinopathy'`
    );
    if (d.length !== 1) throw new Error(`expected one page, found ${d.length}`);
    const diseaseId = d[0].id;
    const { rows } = await client.query<Row>(
      `SELECT id, position, block_type::text AS block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position FOR UPDATE`,
      [diseaseId]
    );

    const find = (re: RegExp, type: string) => rows.findIndex((r) => r.block_type === type && re.test(bare(r)));
    const a = find(/^the capacity.load model/i, "subsection_heading");
    const b = find(/^the spectrum of structural change/i, "subsection_heading");
    const pathoIx = find(/^pathophysiology/i, "section_heading");
    if (a < 0 || b < 0 || pathoIx < 0) throw new Error(`anchors not found: capacity=${a} spectrum=${b} pathophysiology=${pathoIx}`);

    const endOf = (start: number) => {
      const n = rows.findIndex((r, i) => i > start && isHead(r));
      return n < 0 ? rows.length : n;
    };
    const aEnd = endOf(a);
    const bEnd = endOf(b);
    const sectionOf = (ix: number) => {
      for (let i = ix; i >= 0; i--) if (rows[i].block_type === "section_heading") return bare(rows[i]);
      return "";
    };
    if (/pathophysiology/i.test(sectionOf(a)) || /pathophysiology/i.test(sectionOf(b))) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "already inside the Pathophysiology chapter" });
    }
    if (aEnd !== b) throw new Error(`the two subsections are not adjacent (capacity ends at ${aEnd}, spectrum starts at ${b})`);

    // first subsection heading of the Pathophysiology chapter = insertion point
    let target = rows.findIndex((r, i) => i > pathoIx && isHead(r));
    if (target < 0) target = rows.length;
    if (rows[target]?.block_type === "section_heading") throw new Error("Pathophysiology chapter has no subsection to anchor before");

    const moving = rows.slice(a, bEnd);
    const rest = rows.filter((_, i) => i < a || i >= bEnd);
    const tIx = rest.findIndex((r) => r.id === rows[target].id);
    const next = [...rest.slice(0, tIx), ...moving, ...rest.slice(tIx)];

    const plan = {
      moving: moving.map(label),
      placedAfter: label(rest[tIx - 1]),
      placedBefore: label(rest[tIx]),
      oldNeighbours: { before: label(rows[a - 1]), after: bEnd < rows.length ? label(rows[bEnd]) : null },
      total: rows.length,
    };
    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }

    await client.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1`, [diseaseId]);
    await client.query(
      `UPDATE editorial_block b SET position = v.pos FROM unnest($1::uuid[], $2::int[]) AS v(id, pos) WHERE b.id = v.id AND b.disease_id = $3`,
      [next.map((r) => r.id), next.map((_, i) => (i + 1) * 10), diseaseId]
    );
    const { rows: chk } = await client.query<{ n: string; neg: string }>(
      `SELECT count(*)::text AS n, count(*) FILTER (WHERE position < 0)::text AS neg FROM editorial_block WHERE disease_id = $1`,
      [diseaseId]
    );
    if (Number(chk[0].n) !== rows.length || Number(chk[0].neg) !== 0) throw new Error(`position check failed ${JSON.stringify(chk[0])}`);
    await client.query("COMMIT");
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, moved: moving.length, plan });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
