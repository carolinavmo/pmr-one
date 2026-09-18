import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";
import { pool } from "@/lib/db";

// TEMPORARY — applies db/migrations/0053_highlight_table_block.sql
// against production (local dev already has it applied directly).
// Remove after use.
export async function GET() {
  try {
    const sql = readFileSync(
      path.join(process.cwd(), "db", "migrations", "0053_highlight_table_block.sql"),
      "utf-8"
    );
    await pool.query(sql);
    const { rows } = await pool.query(
      `SELECT unnest(enum_range(NULL::editorial_block_type)) AS v`
    );
    const present = rows.some((r: { v: string }) => r.v === "highlight_table");
    return NextResponse.json({ ok: true, highlightTablePresent: present });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
