import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY, read-only — diagnose why migration 0069 failed partway.
export async function GET() {
  try {
    const columns = await pool.query(
      `SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'question_category' ORDER BY ordinal_position`
    );
    const columnNames = columns.rows.map((r) => r.column_name);
    const extra = columnNames.includes("colour_key") ? ", colour_key, subject_id" : "";
    const rows = await pool
      .query(`SELECT id, name, position${extra} FROM question_category`)
      .then((r) => r.rows)
      .catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
    const flagTable = await pool.query(`SELECT to_regclass('question_flag') AS exists`);
    const subjects = await pool.query(`SELECT id, name, position FROM flashcard_subject ORDER BY position`).catch((e) => ({
      error: e instanceof Error ? e.message : String(e),
    }));
    return NextResponse.json({ columns: columns.rows, rows, flagTable: flagTable.rows[0], subjects });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
