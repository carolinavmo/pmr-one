import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { pool } from "@/lib/db";

// TEMPORARY — applies migration 0072 (study_plan, study_plan_topic,
// study_plan_task, study_day_log) to production. Remove this route
// once run.
export async function POST() {
  const sql = await readFile(path.join(process.cwd(), "db/migrations/0072_study_planner_v2.sql"), "utf8");
  try {
    await pool.query(sql);
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM study_plan) AS plans,
         (SELECT COUNT(*)::int FROM study_plan_task) AS tasks,
         (SELECT COUNT(*)::int FROM study_day_log) AS day_logs`
    );
    return NextResponse.json({ ok: true, ...rows[0] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
