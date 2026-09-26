import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { pool } from "@/lib/db";

// TEMPORARY — applies migration 0071 (question_session, question_session_item)
// to production. Remove this route once run.
export async function POST() {
  const sql = await readFile(path.join(process.cwd(), "db/migrations/0071_qbank_session.sql"), "utf8");
  try {
    await pool.query(sql);
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM question_session) AS sessions,
         (SELECT COUNT(*)::int FROM question_session_item) AS session_items`
    );
    return NextResponse.json({ ok: true, ...rows[0] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
