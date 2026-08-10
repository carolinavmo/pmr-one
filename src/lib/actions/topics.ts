"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { getDescendantIds, type TopicIconName } from "@/lib/topics";
import type { CardColor } from "@/lib/editorial-blocks";
import { revalidateShellSurfaces, revalidateDiseaseSurfaces } from "@/lib/revalidation";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

// Every mutation below touches the same set of surfaces: the editor
// itself, the site-wide sidebar (rendered from the root layout, so
// that's the one revalidation call that actually reaches it), and
// the two other places the tree feeds — breadcrumbs on every disease
// page and the catalog's `?topic=` filter.
function revalidateTopicSurfaces() {
  revalidateShellSurfaces();
  revalidateDiseaseSurfaces();
}

async function uniqueSlug(base: string): Promise<string> {
  const slug = slugify(base) || "topic";
  const { rows } = await pool.query(
    `SELECT slug FROM topic WHERE slug = $1 OR slug LIKE $2`,
    [slug, `${slug}-%`]
  );
  const existing = new Set<string>(rows.map((r) => r.slug));
  if (!existing.has(slug)) return slug;
  let n = 2;
  while (existing.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

// Shared by createTopicAction and createSeparatorAction — identical
// slug-uniqueness + next-position bookkeeping either way, differing
// only in the `kind` written. A separator's slug is never linked to
// (it's not navigable — no button renders it as a link), but it still
// gets one: `topic.slug` is UNIQUE, and reusing uniqueSlug() here is
// simpler than teaching it to skip separators.
async function insertTopicRow(
  name: string,
  parentId: string | null,
  kind: "topic" | "separator"
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };

  const slug = await uniqueSlug(trimmed);
  const { rows: positionRows } = await pool.query(
    `SELECT COALESCE(MAX(position), -1) AS max_position FROM topic WHERE parent_id IS NOT DISTINCT FROM $1`,
    [parentId]
  );
  const position = (positionRows[0]?.max_position ?? -1) + 1;

  const { rows } = await pool.query(
    `INSERT INTO topic (slug, name, parent_id, position, kind) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [slug, trimmed, parentId, position, kind]
  );

  revalidateTopicSurfaces();
  return { ok: true, id: rows[0].id };
}

export async function createTopicAction(
  name: string,
  parentId: string | null
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireAdmin();
  if (parentId) {
    const { rows } = await pool.query(`SELECT kind FROM topic WHERE id = $1`, [parentId]);
    if (rows[0]?.kind === "separator") {
      return { ok: false, error: "Can't add a subtopic under a separator." };
    }
  }
  return insertTopicRow(name, parentId, "topic");
}

// Root-level only (founder ask: a plain section break between root
// topics like "MSK" / "Neurology" — not a nestable node). No
// `parentId` param at all, unlike createTopicAction, so there's no way
// to accidentally call this with one.
export async function createSeparatorAction(
  name: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireAdmin();
  return insertTopicRow(name, null, "separator");
}

// Slug is deliberately immutable after creation (unlike name) — it's
// baked into every `?topic=slug` catalog link and breadcrumb URL
// already generated for this topic, and renaming shouldn't break those.
export async function renameTopicAction(id: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  await pool.query(`UPDATE topic SET name = $2 WHERE id = $1`, [id, trimmed]);
  revalidateTopicSurfaces();
  return { ok: true };
}

export async function updateTopicIconAction(
  id: string,
  icon: TopicIconName | null
): Promise<ActionResult> {
  await requireAdmin();
  await pool.query(`UPDATE topic SET icon = $2 WHERE id = $1`, [id, icon]);
  revalidateTopicSurfaces();
  return { ok: true };
}

export async function updateTopicColorAction(
  id: string,
  color: CardColor | null
): Promise<ActionResult> {
  await requireAdmin();
  await pool.query(`UPDATE topic SET color = $2 WHERE id = $1`, [id, color]);
  revalidateTopicSurfaces();
  return { ok: true };
}

// Blocked, not cascaded (founder decision) — re-checked here even
// though the editor UI already disables the delete control for a
// non-empty topic, same "defense in depth" reasoning topics.ts's own
// visibility checks already document.
export async function deleteTopicAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM topic WHERE parent_id = $1) AS child_count,
       (SELECT count(*)::int FROM disease WHERE topic_id = $1) AS disease_count`,
    [id]
  );
  const childCount: number = rows[0].child_count;
  const diseaseCount: number = rows[0].disease_count;

  if (childCount > 0 || diseaseCount > 0) {
    const parts: string[] = [];
    if (childCount > 0) parts.push(`${childCount} subtopic${childCount === 1 ? "" : "s"}`);
    if (diseaseCount > 0) parts.push(`${diseaseCount} condition${diseaseCount === 1 ? "" : "s"}`);
    return {
      ok: false,
      error: `Can't remove — still has ${parts.join(" and ")} attached. Move or remove those first.`,
    };
  }

  await pool.query(`DELETE FROM topic WHERE id = $1`, [id]);
  revalidateTopicSurfaces();
  return { ok: true };
}

// Reorders within a sibling list and/or re-parents in one transaction.
// `newParentId` null means "make this a root topic." Renumbers only
// the target sibling list (0..n-1, moved node inserted at
// `newIndex`) — the old parent's remaining siblings keep their
// existing positions, which is harmless since ordering only ever
// reads `ORDER BY position, name`, not contiguous integers.
export async function moveTopicAction(
  id: string,
  newParentId: string | null,
  newIndex: number
): Promise<ActionResult> {
  await requireAdmin();

  if (newParentId === id) {
    return { ok: false, error: "A topic can't be its own parent." };
  }
  if (newParentId) {
    const descendantIds = await getDescendantIds(id);
    if (descendantIds.includes(newParentId)) {
      return { ok: false, error: "Can't move a topic into one of its own subtopics." };
    }
    const { rows } = await pool.query(`SELECT kind FROM topic WHERE id = $1`, [newParentId]);
    if (rows[0]?.kind === "separator") {
      return { ok: false, error: "Separators can't hold subtopics." };
    }
  }
  {
    const { rows } = await pool.query(`SELECT kind FROM topic WHERE id = $1`, [id]);
    if (rows[0]?.kind === "separator" && newParentId !== null) {
      return { ok: false, error: "Separators can only live at the top level." };
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: siblingRows } = await client.query(
      `SELECT id FROM topic WHERE parent_id IS NOT DISTINCT FROM $1 AND id != $2 ORDER BY position, name`,
      [newParentId, id]
    );
    const siblingIds: string[] = siblingRows.map((row) => row.id);
    const clampedIndex = Math.max(0, Math.min(newIndex, siblingIds.length));
    siblingIds.splice(clampedIndex, 0, id);

    for (let i = 0; i < siblingIds.length; i++) {
      if (siblingIds[i] === id) {
        await client.query(`UPDATE topic SET parent_id = $2, position = $3 WHERE id = $1`, [
          id,
          newParentId,
          i,
        ]);
      } else {
        await client.query(`UPDATE topic SET position = $2 WHERE id = $1`, [siblingIds[i], i]);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  revalidateTopicSurfaces();
  return { ok: true };
}
