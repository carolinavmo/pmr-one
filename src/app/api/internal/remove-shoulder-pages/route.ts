import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// Removes the two superseded Shoulder Anatomy pages ("Shoulder
// Anatomy" and "Shoulder Anatomy - Quick Recap"), keeping only
// "Shoulder Anatomy V7". Same relationship-table cleanup order
// admin/actions.ts's deleteDiseaseAction uses, minus its pg_dump
// backup step (only resolves a Windows install path — can't run on
// this Linux container, same gap found and worked around for the
// elbow-translation cleanup earlier this session). flashcard_deck's
// source_disease_id is ON DELETE SET NULL, so it needs no cleanup
// here.
//
// Safety: aborts without deleting anything unless exactly 3
// shoulder-anatomy disease rows exist and exactly one of them is the
// V7 page being kept.
const DISEASE_RELATIONSHIP_TABLES = [
  "algorithm_treats_disease",
  "imaging_finding_disease_relationship",
  "maneuver_disease_relationship",
  "rehabilitation_protocol_treats_disease",
  "risk_factor_disease_relationship",
];

export async function GET() {
  const { rows: candidates } = await pool.query(
    `SELECT id, slug, canonical_name FROM disease WHERE canonical_name ILIKE '%shoulder%' ORDER BY canonical_name`
  );

  const keep = candidates.filter((d) => /v7/i.test(d.canonical_name));
  const toRemove = candidates.filter((d) => !/v7/i.test(d.canonical_name));

  if (candidates.length !== 3 || keep.length !== 1 || toRemove.length !== 2) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected shoulder-anatomy page set — aborting without deleting anything",
        candidates,
      },
      { status: 409 }
    );
  }

  const removed: { slug: string; canonicalName: string }[] = [];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const disease of toRemove) {
      for (const table of DISEASE_RELATIONSHIP_TABLES) {
        await client.query(`DELETE FROM ${table} WHERE disease_id = $1`, [disease.id]);
      }
      await client.query(`DELETE FROM editorial_block WHERE disease_id = $1`, [disease.id]);
      await client.query(`DELETE FROM disease WHERE id = $1`, [disease.id]);
      removed.push({ slug: disease.slug, canonicalName: disease.canonical_name });
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  revalidateShellSurfaces();

  return NextResponse.json({ ok: true, removed, kept: keep[0] });
}
