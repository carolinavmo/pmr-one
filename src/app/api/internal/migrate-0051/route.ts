import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Temporary, one-shot migration route — same pattern as migrate-0049/0050.
// Adds the 'subsubsection_heading' value to the editorial_block_type enum
// so the new Sub-subheading block can actually be inserted on production.
export async function GET() {
  try {
    await pool.query(`ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'subsubsection_heading'`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
