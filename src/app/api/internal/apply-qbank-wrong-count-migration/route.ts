import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { pool } from "@/lib/db";

// TEMPORARY — applies migration 0070 (question_attempt.wrong_count) to
// production. Remove this route once run.
export async function POST() {
  const sql = await readFile(path.join(process.cwd(), "db/migrations/0070_qbank_wrong_count.sql"), "utf8");
  try {
    await pool.query(sql);
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE wrong_count > 0)::int AS backfilled FROM question_attempt`
    );
    return NextResponse.json({ ok: true, ...rows[0] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
