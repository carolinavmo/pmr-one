import { pool } from "@/lib/db";
import type { CardColor } from "@/lib/editorial-blocks";

// "My Clinical Handbook" — a member's own free-form notes, grouped into
// sections. Same pool.query pattern as study-planner.ts, no ORM. Every
// mutation re-checks ownership in the SQL itself (WHERE id = $x AND
// user_id = $y) rather than trusting a caller-supplied id alone.

export interface AtlasSection {
  id: string;
  name: string;
  color: CardColor;
  position: number;
  createdAt: string;
}

export interface AtlasPage {
  id: string;
  sectionId: string;
  title: string;
  body: string;
  position: number;
  updatedAt: string;
}

// Distinct starting colors so the 3 defaults read as visually separate
// right away, the same way default topics ship pre-assigned colors
// rather than all landing on the palette's neutral default.
const DEFAULT_SECTION_COLORS: CardColor[] = ["accent", "trust", "insight"];

function mapSectionRow(r: {
  id: string;
  name: string;
  color: CardColor;
  position: number;
  created_at: Date | string;
}): AtlasSection {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    position: r.position,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

function mapPageRow(r: {
  id: string;
  section_id: string;
  title: string;
  body: string;
  position: number;
  updated_at: Date | string;
}): AtlasPage {
  return {
    id: r.id,
    sectionId: r.section_id,
    title: r.title,
    body: r.body,
    position: r.position,
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
  };
}

// Seeds the 3 default sections (using the already-translated names the
// caller passes in) only the first time a member has zero sections —
// every visit after that is a no-op read. The defaults aren't a
// special "kind": once created they're ordinary rows a member can
// rename, recolor, or delete like any other.
export async function getAtlasWorkspace(
  userId: string,
  defaultSectionNames: [string, string, string]
): Promise<{ sections: AtlasSection[]; pages: AtlasPage[] }> {
  const { rows: existing } = await pool.query(
    `SELECT id FROM atlas_section WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  if (existing.length === 0) {
    for (let i = 0; i < defaultSectionNames.length; i++) {
      await pool.query(
        `INSERT INTO atlas_section (user_id, name, color, position) VALUES ($1, $2, $3, $4)`,
        [userId, defaultSectionNames[i], DEFAULT_SECTION_COLORS[i], i]
      );
    }
  }

  const [{ rows: sectionRows }, { rows: pageRows }] = await Promise.all([
    pool.query(
      `SELECT id, name, color, position, created_at FROM atlas_section WHERE user_id = $1 ORDER BY position ASC, created_at ASC`,
      [userId]
    ),
    pool.query(
      `SELECT id, section_id, title, body, position, updated_at FROM atlas_page WHERE user_id = $1 ORDER BY position ASC, created_at ASC`,
      [userId]
    ),
  ]);

  return {
    sections: sectionRows.map(mapSectionRow),
    pages: pageRows.map(mapPageRow),
  };
}

export async function createSection(userId: string, name: string): Promise<AtlasSection> {
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM atlas_section WHERE user_id = $1`,
    [userId]
  );
  const { rows } = await pool.query(
    `INSERT INTO atlas_section (user_id, name, position) VALUES ($1, $2, $3)
     RETURNING id, name, color, position, created_at`,
    [userId, name, countRows[0].count]
  );
  return mapSectionRow(rows[0]);
}

export async function renameSection(userId: string, sectionId: string, name: string): Promise<void> {
  await pool.query(`UPDATE atlas_section SET name = $1 WHERE id = $2 AND user_id = $3`, [
    name,
    sectionId,
    userId,
  ]);
}

export async function updateSectionColor(
  userId: string,
  sectionId: string,
  color: CardColor
): Promise<void> {
  await pool.query(`UPDATE atlas_section SET color = $1 WHERE id = $2 AND user_id = $3`, [
    color,
    sectionId,
    userId,
  ]);
}

export async function deleteSection(userId: string, sectionId: string): Promise<void> {
  await pool.query(`DELETE FROM atlas_section WHERE id = $1 AND user_id = $2`, [sectionId, userId]);
}

// `orderedIds` is the full new order for the caller's section list —
// simpler and more robust than a single up/down neighbor swap (no
// unique constraint on `position` here, so there's no collision to
// dance around the way disease-page block reordering has to).
export async function reorderSections(userId: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(`UPDATE atlas_section SET position = $1 WHERE id = $2 AND user_id = $3`, [
      i,
      orderedIds[i],
      userId,
    ]);
  }
}

export async function reorderPages(
  userId: string,
  sectionId: string,
  orderedIds: string[]
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(
      `UPDATE atlas_page SET position = $1 WHERE id = $2 AND user_id = $3 AND section_id = $4`,
      [i, orderedIds[i], userId, sectionId]
    );
  }
}

export async function createPage(userId: string, sectionId: string, title: string): Promise<AtlasPage> {
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM atlas_page WHERE section_id = $1`,
    [sectionId]
  );
  const { rows } = await pool.query(
    `INSERT INTO atlas_page (user_id, section_id, title, position)
     VALUES ($1, $2, $3, $4)
     RETURNING id, section_id, title, body, position, updated_at`,
    [userId, sectionId, title, countRows[0].count]
  );
  return mapPageRow(rows[0]);
}

// Serves the "Templates" use case directly — copy a template page's
// content into a new one and start editing, rather than retyping it.
export async function duplicatePage(userId: string, pageId: string, newTitle: string): Promise<AtlasPage> {
  const { rows: source } = await pool.query(
    `SELECT section_id, body FROM atlas_page WHERE id = $1 AND user_id = $2`,
    [pageId, userId]
  );
  if (source.length === 0) throw new Error("Page not found");
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM atlas_page WHERE section_id = $1`,
    [source[0].section_id]
  );
  const { rows } = await pool.query(
    `INSERT INTO atlas_page (user_id, section_id, title, body, position)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, section_id, title, body, position, updated_at`,
    [userId, source[0].section_id, newTitle, source[0].body, countRows[0].count]
  );
  return mapPageRow(rows[0]);
}

export async function renamePage(userId: string, pageId: string, title: string): Promise<void> {
  await pool.query(`UPDATE atlas_page SET title = $1, updated_at = now() WHERE id = $2 AND user_id = $3`, [
    title,
    pageId,
    userId,
  ]);
}

// Moved pages always land at the end of their new section — appending
// via a fresh COUNT(*) avoids colliding with positions already in use
// there (the source section's own positions are left with a gap, which
// is harmless since ordering only ever reads relative order, not
// contiguous values).
export async function movePage(userId: string, pageId: string, sectionId: string): Promise<void> {
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM atlas_page WHERE section_id = $1`,
    [sectionId]
  );
  await pool.query(
    `UPDATE atlas_page SET section_id = $1, position = $2, updated_at = now() WHERE id = $3 AND user_id = $4`,
    [sectionId, countRows[0].count, pageId, userId]
  );
}

export async function updatePageBody(userId: string, pageId: string, body: string): Promise<void> {
  await pool.query(`UPDATE atlas_page SET body = $1, updated_at = now() WHERE id = $2 AND user_id = $3`, [
    body,
    pageId,
    userId,
  ]);
}

export async function deletePage(userId: string, pageId: string): Promise<void> {
  await pool.query(`DELETE FROM atlas_page WHERE id = $1 AND user_id = $2`, [pageId, userId]);
}
