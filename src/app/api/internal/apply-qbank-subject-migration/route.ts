import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { pool } from "@/lib/db";

// TEMPORARY — applies migration 0069 (question_category.subject_id +
// colour_key, question_flag table) to production. Remove this route
// once run.
export async function POST() {
  const sql = await readFile(path.join(process.cwd(), "db/migrations/0069_qbank_folder_subject_and_colour.sql"), "utf8");
  try {
    await pool.query(sql);
    const { rows } = await pool.query(
      `SELECT c.name, c.colour_key, s.name AS subject FROM question_category c LEFT JOIN flashcard_subject s ON s.id = c.subject_id`
    );
    return NextResponse.json({ ok: true, folders: rows });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
