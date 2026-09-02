import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// TEMP DEBUG: the "Shoulder Anatomy" / "Shoulder Anatomy - Quick
// Recap" pages the founder wants removed aren't turning up under a
// canonical_name search for "%shoulder%" (only "Shoulder Anatomy V7"
// matches) — listing everything under an Anatomy-named topic, plus
// anything shoulder-named regardless of topic, to find out why before
// writing the actual deletion.
export async function GET() {
  const { rows: allInAnatomy } = await pool.query(
    `SELECT d.id, d.slug, d.canonical_name, d.status, t.name AS topic_name
     FROM disease d LEFT JOIN topic t ON t.id = d.topic_id
     WHERE t.name ILIKE '%anatomy%' OR d.canonical_name ILIKE '%shoulder%'
     ORDER BY d.canonical_name`
  );
  return NextResponse.json({ ok: true, allInAnatomy });
}
