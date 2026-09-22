import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMPORARY — applies migration 0059 (clinical_calculator_usage) against
// production. Idempotent (IF NOT EXISTS throughout) — safe to hit more
// than once, and touches nothing else. Remove this route after use.
export async function GET() {
  await pool.query(`CREATE TABLE IF NOT EXISTS clinical_calculator_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calculator_id UUID NOT NULL REFERENCES clinical_calculator(id) ON DELETE CASCADE,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS clinical_calculator_usage_user_calc_opened_idx
    ON clinical_calculator_usage (user_id, calculator_id, opened_at)`);

  return NextResponse.json({ ok: true, clinicalCalculatorUsage: "ready" });
}
