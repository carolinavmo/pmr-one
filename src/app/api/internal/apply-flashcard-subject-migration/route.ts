import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { pool } from "@/lib/db";

// TEMPORARY — applies migration 0068 (flashcard_subject table,
// replacing the fixed 4-value subject CHECK constraint) to production.
// Remove this route once run.
export async function POST() {
  const sql = await readFile(path.join(process.cwd(), "db/migrations/0068_flashcard_subject_table.sql"), "utf8");
  try {
    await pool.query(sql);
    const { rows } = await pool.query("SELECT id, name, color, position FROM flashcard_subject ORDER BY position");
    return NextResponse.json({ ok: true, subjects: rows });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
