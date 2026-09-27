import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { pool } from "@/lib/db";

// TEMPORARY — applies migration 0073 (study_plan_task.topic_id) to
// production. Remove this route once run.
export async function POST() {
  const sql = await readFile(path.join(process.cwd(), "db/migrations/0073_study_plan_task_topic_id.sql"), "utf8");
  try {
    await pool.query(sql);
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM study_plan_task) AS tasks,
         (SELECT COUNT(*)::int FROM study_plan_task WHERE topic_id IS NOT NULL) AS with_topic`
    );
    return NextResponse.json({ ok: true, ...rows[0] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
