import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces } from "@/lib/revalidation";

// Removes the 3 standalone translated Elbow Anatomy disease rows now
// that their content lives in editorial_block_translation (see
// migrate-elbow-translations) and the real elbow-anatomy page serves
// them per-locale — these copies would otherwise keep showing up as
// their own separate entries in the sidebar topic tree. Same
// relationship-table cleanup order admin/actions.ts's deleteDiseaseAction
// uses (minus its pg_dump backup step, which only resolves a Windows
// install path and can't run on this Linux container); run only after
// verifying the locale-aware page works.
const SLUGS = ["elbow-anatomy-es", "elbow-anatomy-pt-pt", "elbow-anatomy-pt-br"];

const DISEASE_RELATIONSHIP_TABLES = [
  "algorithm_treats_disease",
  "imaging_finding_disease_relationship",
  "maneuver_disease_relationship",
  "rehabilitation_protocol_treats_disease",
  "risk_factor_disease_relationship",
];

export async function GET() {
  const client = await pool.connect();
  const removed: string[] = [];
  try {
    await client.query("BEGIN");
    for (const slug of SLUGS) {
      const { rows } = await client.query(`SELECT id FROM disease WHERE slug = $1`, [slug]);
      const diseaseId = rows[0]?.id as string | undefined;
      if (!diseaseId) continue;
      for (const table of DISEASE_RELATIONSHIP_TABLES) {
        await client.query(`DELETE FROM ${table} WHERE disease_id = $1`, [diseaseId]);
      }
      await client.query(`DELETE FROM editorial_block WHERE disease_id = $1`, [diseaseId]);
      await client.query(`DELETE FROM disease WHERE id = $1`, [diseaseId]);
      removed.push(slug);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    client.release();
  }

  revalidateShellSurfaces();
  return NextResponse.json({ ok: true, removed });
}
