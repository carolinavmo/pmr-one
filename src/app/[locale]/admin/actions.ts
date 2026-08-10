"use server";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces, revalidateDiseaseSurfaces } from "@/lib/revalidation";

const execFileAsync = promisify(execFile);

async function requireReviewer() {
  const session = await auth();
  if (session?.user.role !== "editor" && session?.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

// Stricter than requireReviewer — deletion is irreversible in a way
// publish/unpublish isn't, so it's gated to admin specifically, same
// as the topic-tree management actions (src/lib/actions/topics.ts).
async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

// Every table with a NO ACTION foreign key to disease(id) — CASCADE
// tables (disease_favorite, note, page_view) clean themselves up and
// don't need to be listed. Confirmed against information_schema at
// the time of writing; a new relationship table added later needs a
// line here too, or its DELETE FROM disease below will fail loudly
// with a foreign-key-violation rather than silently leaving orphans —
// loud failure is the correct behavior for a table this list misses.
const DISEASE_RELATIONSHIP_TABLES = [
  "algorithm_treats_disease",
  "imaging_finding_disease_relationship",
  "maneuver_disease_relationship",
  "rehabilitation_protocol_treats_disease",
  "risk_factor_disease_relationship",
];

export async function publishDisease(formData: FormData) {
  const session = await requireReviewer();
  const id = formData.get("diseaseId");

  await pool.query(
    `UPDATE disease
     SET status = 'published', published_at = now(),
         reviewed_by = $2, reviewed_at = now(), updated_at = now()
     WHERE id = $1`,
    [id, session.user.id]
  );

  revalidateShellSurfaces();
  revalidateDiseaseSurfaces();
}

export async function unpublishDisease(formData: FormData) {
  await requireReviewer();
  const id = formData.get("diseaseId");

  await pool.query(
    `UPDATE disease
     SET status = 'draft', published_at = NULL, updated_at = now()
     WHERE id = $1`,
    [id]
  );

  revalidateShellSurfaces();
  revalidateDiseaseSurfaces();
}

export type DeleteDiseaseResult = { ok: true } | { ok: false; error: string };

// Permanently deletes a disease and its editorial content. Built after
// the exact same operation was once done by hand via a throwaway
// script with no backup — this version can't run without one: the
// backup is taken first and the delete is skipped entirely if it
// fails, rather than proceeding on a best-effort basis. The Knowledge
// Graph objects a disease's blocks reference (risk factors, maneuvers,
// algorithms, imaging findings, rehab protocols) are intentionally
// left untouched — they're shared, reusable objects owned by no single
// disease, not this disease's private content.
export async function deleteDiseaseAction(
  diseaseId: string,
  confirmSlug: string
): Promise<DeleteDiseaseResult> {
  await requireAdmin();

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT slug, canonical_name FROM disease WHERE id = $1`,
      [diseaseId]
    );
    const disease = rows[0] as { slug: string; canonical_name: string } | undefined;
    if (!disease) {
      return { ok: false, error: "Disease not found." };
    }
    // Re-checked server-side, not just relied on the client's disabled
    // button — the same defense-in-depth pattern deleteTopicAction uses.
    if (confirmSlug !== disease.slug) {
      return { ok: false, error: "Confirmation text didn't match — nothing was deleted." };
    }

    try {
      await execFileAsync("node", ["scripts/backup-db.mjs"], { cwd: process.cwd() });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Backup failed, delete aborted (nothing was touched): ${message}` };
    }

    await client.query("BEGIN");
    for (const table of DISEASE_RELATIONSHIP_TABLES) {
      await client.query(`DELETE FROM ${table} WHERE disease_id = $1`, [diseaseId]);
    }
    await client.query(`DELETE FROM editorial_block WHERE disease_id = $1`, [diseaseId]);
    await client.query(`DELETE FROM disease WHERE id = $1`, [diseaseId]);
    await client.query("COMMIT");

    revalidateShellSurfaces();
    revalidateDiseaseSurfaces();
    return { ok: true };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Delete failed: ${message}` };
  } finally {
    client.release();
  }
}
