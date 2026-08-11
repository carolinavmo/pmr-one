"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { revalidateShellSurfaces } from "@/lib/revalidation";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

async function uniqueDiseaseSlug(base: string): Promise<string> {
  const slug = slugify(base) || "condition";
  const { rows } = await pool.query(
    `SELECT slug FROM disease WHERE slug = $1 OR slug LIKE $2`,
    [slug, `${slug}-%`]
  );
  const existing = new Set<string>(rows.map((r) => r.slug));
  if (!existing.has(slug)) return slug;
  let n = 2;
  while (existing.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

// The in-browser replacement for what used to require a one-off
// db/seed/*.mjs script — creates the bare `disease` row (status
// 'draft', attached to `topicId`, no blocks yet) and hands back its
// slug so the caller can route straight into the new page's edit
// mode. Everything past this point (Overview, sections, Knowledge
// Object reuse) is authored the normal way, in-page, via the existing
// EditMode/BlockPicker flow — this action's only job is getting an
// empty, editable page to exist.
export async function createDiseaseAction(
  name: string,
  topicId: string
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  if (!topicId) return { ok: false, error: "Choose a topic first." };

  const slug = await uniqueDiseaseSlug(trimmed);
  await pool.query(
    `INSERT INTO disease (canonical_name, slug, topic_id, status) VALUES ($1, $2, $3, 'draft')`,
    [trimmed, slug, topicId]
  );

  revalidateShellSurfaces();

  return { ok: true, slug };
}

// Reorders a condition within its own topic's disease list — the
// Manage Topics drag-and-drop, condition side. Mirrors
// moveTopicAction's sibling-renumbering shape (topics.ts's own
// actions file) but never re-parents: a condition is only ever
// dropped onto another condition row in the same topic, so `topicId`
// is asserted against the row's actual topic_id rather than written,
// same "re-check ownership in the SQL itself" discipline
// study-planner.ts's mutations already follow.
export async function moveDiseaseAction(
  diseaseId: string,
  topicId: string,
  newIndex: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: siblingRows } = await client.query(
      `SELECT id FROM disease WHERE topic_id = $1 AND id != $2 ORDER BY position, canonical_name`,
      [topicId, diseaseId]
    );
    const siblingIds: string[] = siblingRows.map((row) => row.id);
    const clampedIndex = Math.max(0, Math.min(newIndex, siblingIds.length));
    siblingIds.splice(clampedIndex, 0, diseaseId);

    for (let i = 0; i < siblingIds.length; i++) {
      await client.query(`UPDATE disease SET position = $2 WHERE id = $1 AND topic_id = $3`, [
        siblingIds[i],
        i,
        topicId,
      ]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  revalidateShellSurfaces();
  return { ok: true };
}
