import { pool } from "@/lib/db";

// Temporary, user-triggered, one-shot migration runner — applies
// db/migrations/0050_image_row_block.sql (a single idempotent
// `ALTER TYPE ... ADD VALUE IF NOT EXISTS`) directly against
// production, since there's no CI/CD migration step yet. Deleted
// immediately after being hit once.
export async function GET() {
  await pool.query(`ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'image_row'`);
  return Response.json({ ok: true });
}
