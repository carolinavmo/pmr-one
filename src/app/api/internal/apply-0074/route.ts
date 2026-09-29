import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { pool } from "@/lib/db";

// TEMPORARY — applies migration 0074 (study_plan.mode/order_mode/
// weekly_target, study_plan_item, study_plan_task.scheduled_for
// nullable + queue_position/completed_via/plan_item_id) to production.
// Remove this route once run.
export async function POST() {
  const sql = await readFile(path.join(process.cwd(), "db/migrations/0074_study_plan_content_and_modes.sql"), "utf8");
  try {
    await pool.query(sql);
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM study_plan_item) AS plan_items,
         (SELECT COUNT(*)::int FROM study_plan_task WHERE scheduled_for IS NULL) AS queued_tasks,
         (SELECT COUNT(*)::int FROM study_plan) AS plans`
    );
    return NextResponse.json({ ok: true, ...rows[0] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
